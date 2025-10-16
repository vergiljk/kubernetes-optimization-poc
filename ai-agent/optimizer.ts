#!/usr/bin/env node

/**
 * K8s Resource Optimizer using Claude Agent SDK (TypeScript)
 * Enhanced version with proper MCP configuration and error handling
 */

console.log('📦 Loading modules...');

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

console.log('✅ All modules loaded successfully');

const execAsync = promisify(exec);

interface K8sConfig {
  service_name: string;
  cpu: string;
  memory: string;
  replicas: number;
  namespace: string;
}

interface AnalysisResult {
  service_name: string;
  status: 'optimizable' | 'well-sized' | 'insufficient_data' | 'error';
  current_config?: {
    cpu: string;
    memory: string;
    replicas: number;
  };
  recommended_config?: {
    cpu: string;
    memory: string;
    replicas: number;
  };
  reasoning?: string;
  metrics_summary?: {
    datasources_found: string;
    metrics_available: string;
    cpu_data: string;
    memory_data: string;
  };
  savings?: {
    cpu_percent: number;
    memory_percent: number;
  };
  error?: string;
  raw_response?: string;
}

interface OptimizerConfig {
  grafana_url: string;
  grafana_token: string;
  services: string[];
}

class K8sOptimizerSDK {
  private config: OptimizerConfig;

  constructor(config: OptimizerConfig) {
    this.config = config;
  }

  /**
   * Get current Kubernetes deployment configuration
   */
  async getK8sConfig(serviceName: string): Promise<K8sConfig | null> {
    try {
      const { stdout } = await execAsync(`kubectl get deployment ${serviceName} -o json`);
      const deployment = JSON.parse(stdout);

      const container = deployment.spec.template.spec.containers[0];
      const resources = container.resources || {};
      const requests = resources.requests || {};

      const config: K8sConfig = {
        service_name: serviceName,
        cpu: requests.cpu || '0',
        memory: requests.memory || '0',
        replicas: deployment.spec.replicas,
        namespace: deployment.metadata.namespace || 'default'
      };

      console.log(`✅ Retrieved K8s config for ${serviceName}: CPU=${config.cpu}, Memory=${config.memory}, Replicas=${config.replicas}`);
      return config;

    } catch (error) {
      console.error(`❌ Error getting k8s config for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Analyze a service using Claude Agent SDK with MCP tools
   */
  async analyzeServiceWithMCP(serviceName: string): Promise<AnalysisResult> {
    console.log(`\n🔍 Analyzing ${serviceName} using Claude Agent SDK + MCP...`);

    // Get current Kubernetes configuration
    const k8sConfig = await this.getK8sConfig(serviceName);
    if (!k8sConfig) {
      return {
        service_name: serviceName,
        status: 'error',
        error: 'Could not retrieve Kubernetes configuration'
      };
    }

    // Configure MCP servers for Grafana
    const mcpServers = {
      grafana: {
        command: 'docker',
        args: [
          'exec', '-i', 'grafana-mcp',
          '/app/mcp-grafana', '-t', 'stdio'
        ]
      }
    };

    // Define allowed MCP tools
    const allowedTools = [
      'mcp__grafana__list_datasources',
      'mcp__grafana__list_prometheus_metric_names',
      'mcp__grafana__query_prometheus'
    ];

    // Analysis prompt that uses MCP tools
    const analysisPrompt = `
You are an expert Kubernetes resource optimization analyst with access to Grafana/Prometheus via MCP tools.

Analyze service: ${serviceName}

Current Kubernetes Configuration:
${JSON.stringify(k8sConfig, null, 2)}

Service Port Mapping (for querying metrics):
- service-a: port 30080 (8080 internal)
- service-b: port 30081 (8081 internal)
- service-c: port 30082 (8082 internal)
- service-d: port 30083 (8083 internal)
- service-e: port 30084 (8084 internal)

Analysis Steps:
1. Use mcp__grafana__list_datasources to find the Prometheus datasource
2. Use mcp__grafana__query_prometheus to query actual CPU and memory usage over the last 1 hour
3. Query these metrics (replace <port> with the service's port):
   - CPU: process_cpu_usage OR system_cpu_usage (filter by instance="host.docker.internal:<port>")
   - Memory: jvm_memory_used_bytes{area="heap"} (filter by instance)
   - HTTP requests: http_server_requests_seconds_count (to understand load patterns)

4. Calculate peak usage from the metrics
5. Compare peak usage to current Kubernetes resource requests
6. Determine if service is over-provisioned (current > 200% of peak usage)

Optimization Guidelines:
- Consider a service OPTIMIZABLE if current resources are >200% of peak usage
- Consider a service WELL-SIZED if current resources are 120-200% of peak usage
- Recommended resources should be: peak_usage * 1.5 (50% safety buffer)
- Round CPU to nearest 10m (e.g., 45m → 50m, 120m → 120m)
- Round memory to nearest 128Mi (e.g., 150Mi → 256Mi, 350Mi → 384Mi)
- Minimum recommendations: 50m CPU, 128Mi memory
- Never recommend less than current usage

CRITICAL: Return ONLY valid JSON with no additional text, markdown, or code blocks.
Do not wrap the JSON in backticks or code fences.
Return the raw JSON object directly:
{
    "service_name": "${serviceName}",
    "status": "optimizable" | "well-sized" | "insufficient_data",
    "current_config": {
        "cpu": "${k8sConfig.cpu}",
        "memory": "${k8sConfig.memory}",
        "replicas": ${k8sConfig.replicas}
    },
    "recommended_config": {
        "cpu": "recommended CPU request",
        "memory": "recommended memory request",
        "replicas": recommended_replica_count
    },
    "reasoning": "detailed explanation with actual metrics if available",
    "metrics_summary": {
        "datasources_found": "number of datasources found",
        "metrics_available": "number of metrics found",
        "cpu_data": "CPU metrics summary or 'unavailable'",
        "memory_data": "Memory metrics summary or 'unavailable'"
    },
    "savings": {
        "cpu_percent": percentage_cpu_savings,
        "memory_percent": percentage_memory_savings
    }
}`;

    try {
      console.log(`📤 Sending query to Claude SDK...`);
      console.log(`📊 Prompt length: ${analysisPrompt.length} characters`);

      // Query Claude with MCP access
      let finalResponse = '';
      let messageCount = 0;

      for await (const message of query({
        prompt: analysisPrompt,
        options: {
          model: 'claude-haiku-4-5',
          mcpServers,
          allowedTools
        }
      })) {
        messageCount++;
        console.log(`📨 Message ${messageCount} type: ${message.type}`);

        // Handle different message types according to SDKMessage documentation
        switch (message.type) {
          case 'assistant':
            // Assistant's response - this contains the actual analysis
            if (message.message?.content) {
              // Handle content which might be string or array
              let contentText = '';
              if (typeof message.message.content === 'string') {
                contentText = message.message.content;
              } else if (Array.isArray(message.message.content)) {
                // Extract text from content blocks
                contentText = message.message.content
                  .filter((block: any) => block.type === 'text')
                  .map((block: any) => block.text)
                  .join('');
              } else {
                contentText = JSON.stringify(message.message.content);
              }

              finalResponse += contentText;
              console.log(`📝 Assistant content: ${contentText.substring(0, 100)}...`);
            }
            break;
          case 'result':
            // Final result message - contains execution metadata
            console.log(`🎯 Result: ${message.subtype}, duration: ${message.duration_ms}ms, error: ${message.is_error}`);
            if (message.is_error) {
              console.log(`❌ Result indicates error occurred during execution`);
            }
            break;
          case 'system':
            // System messages (tool calls, etc.)
            console.log(`⚙️ System message: ${message.subtype || 'unknown'}`);
            break;
          case 'user':
            // User messages (echoed back)
            console.log(`👤 User message echoed`);
            break;
          default:
            console.log(`🔍 Other message type: ${message.type}`);
        }
      }

      console.log(`📊 Total messages received: ${messageCount}`);
      console.log(`📝 Final response length: ${finalResponse.length} characters`);

      if (!finalResponse) {
        console.warn(`⚠️ Received empty response from Claude SDK`);
        return {
          service_name: serviceName,
          status: 'error',
          error: 'No response from Claude SDK'
        };
      }

      // Clean up response - remove markdown code fences if present
      let cleanedResponse = finalResponse.trim();

      // Look for JSON code fence patterns
      const jsonFenceMatch = cleanedResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonFenceMatch) {
        cleanedResponse = jsonFenceMatch[1];
      } else {
        // Try regular code fence
        const regularFenceMatch = cleanedResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (regularFenceMatch) {
          cleanedResponse = regularFenceMatch[1];
        }
      }

      // Extract JSON from response (find the outermost { } pair)
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
        console.log(`📋 Extracted JSON (first 200 chars): ${jsonString.substring(0, 200)}...`);

        try {
          const result: AnalysisResult = JSON.parse(jsonString);
          console.log(`✅ Analysis complete for ${serviceName}: ${result.status}`);
          return result;
        } catch (jsonError) {
          console.error(`❌ JSON decode error:`, jsonError);
          console.error(`📄 Full response:\n${finalResponse}`);
          console.error(`📄 Attempted to parse:\n${jsonString.substring(0, 1000)}`);
          return {
            service_name: serviceName,
            status: 'error',
            error: `Invalid JSON in response: ${jsonError}`,
            raw_response: finalResponse.substring(0, 500)
          };
        }
      } else {
        console.error(`📄 Full response (no JSON found):\n${finalResponse}`);
        return {
          service_name: serviceName,
          status: 'error',
          error: 'No JSON found in response',
          raw_response: finalResponse.substring(0, 500)
        };
      }

    } catch (error) {
      console.error(`❌ Error analyzing ${serviceName}:`, error);
      return {
        service_name: serviceName,
        status: 'error',
        error: String(error)
      };
    }
  }

  /**
   * Generate PR description using Claude SDK
   */
  async createPRDescription(analysis: AnalysisResult): Promise<string> {
    if (analysis.status !== 'optimizable') {
      return '';
    }

    const prPrompt = `
Create a well-formatted GitHub Pull Request description for Kubernetes resource optimization.

Analysis Data:
${JSON.stringify(analysis, null, 2)}

Create a professional PR description with:
1. Title: "Optimize resources for ${analysis.service_name}"
2. Summary table of current vs recommended resources
3. Metrics data and reasoning
4. Expected savings and impact
5. Technical implementation details

Format as markdown.
`;

    try {
      let prResponse = '';

      for await (const message of query({
        prompt: prPrompt,
        options: {
          model: 'claude-haiku-4-5'
        }
      })) {
        // Handle different message types
        switch (message.type) {
          case 'assistant':
            // Assistant's response - this contains the PR description
            if (message.message?.content) {
              // Handle content which might be string or array
              let contentText = '';
              if (typeof message.message.content === 'string') {
                contentText = message.message.content;
              } else if (Array.isArray(message.message.content)) {
                // Extract text from content blocks
                contentText = message.message.content
                  .filter((block: any) => block.type === 'text')
                  .map((block: any) => block.text)
                  .join('');
              } else {
                contentText = JSON.stringify(message.message.content);
              }

              prResponse += contentText;
            }
            break;
          case 'system':
            console.log(`⚙️ PR generation system message: ${message.subtype || 'unknown'}`);
            break;
        }
      }

      return prResponse;
    } catch (error) {
      console.error(`❌ Error creating PR description:`, error);
      return `Error generating PR description: ${error}`;
    }
  }

  /**
   * Run complete optimization cycle using Claude Agent SDK
   */
  async runOptimizationCycle(): Promise<AnalysisResult[]> {
    console.log('='.repeat(80));
    console.log('🚀 STARTING K8S RESOURCE OPTIMIZATION (Claude Agent SDK - TypeScript)');
    console.log('='.repeat(80));

    const results: AnalysisResult[] = [];

    try {
      // Analyze each service
      for (const serviceName of this.config.services) {
        console.log(`\n--- Analyzing ${serviceName} ---`);
        const analysis = await this.analyzeServiceWithMCP(serviceName);
        results.push(analysis);

        // Generate PR description for optimizable services
        if (analysis.status === 'optimizable') {
          console.log(`📝 Generating PR description for ${serviceName}...`);
          const prDescription = await this.createPRDescription(analysis);

          console.log(`\n📋 PR DESCRIPTION FOR ${serviceName}:`);
          console.log('='.repeat(60));
          console.log(prDescription);
          console.log('='.repeat(60));
        }
      }

      // Generate summary
      this.printSummary(results);

    } catch (error) {
      console.error(`❌ Error during optimization cycle:`, error);
    }

    return results;
  }

  /**
   * Print optimization summary
   */
  printSummary(results: AnalysisResult[]): void {
    const optimizable = results.filter(r => r.status === 'optimizable');
    const wellSized = results.filter(r => r.status === 'well-sized');
    const insufficientData = results.filter(r => r.status === 'insufficient_data');
    const errors = results.filter(r => r.status === 'error');

    console.log('\n' + '='.repeat(80));
    console.log('📊 OPTIMIZATION CYCLE COMPLETE (Claude Agent SDK - TypeScript)');
    console.log('='.repeat(80));
    console.log(`📈 Total services analyzed: ${results.length}`);
    console.log(`🔧 Optimizable services: ${optimizable.length}`);
    console.log(`✅ Well-sized services: ${wellSized.length}`);
    console.log(`📊 Insufficient data: ${insufficientData.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (optimizable.length > 0) {
      console.log(`\n🔧 OPTIMIZABLE SERVICES:`);
      for (const service of optimizable) {
        const savings = service.savings || { cpu_percent: 0, memory_percent: 0 };
        const current = service.current_config || { cpu: 'unknown', memory: 'unknown' };
        const recommended = service.recommended_config || { cpu: 'unknown', memory: 'unknown' };

        console.log(`  📈 ${service.service_name}:`);
        console.log(`     Current: CPU=${current.cpu}, Memory=${current.memory}`);
        console.log(`     Recommended: CPU=${recommended.cpu}, Memory=${recommended.memory}`);
        console.log(`     Savings: CPU ${savings.cpu_percent.toFixed(1)}%, Memory ${savings.memory_percent.toFixed(1)}%`);
      }
    }

    if (errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      for (const service of errors) {
        console.log(`  ${service.service_name}: ${service.error || 'Unknown error'}`);
      }
    }
  }
}

/**
 * Load environment variables from .env file
 */
async function loadEnvironment(): Promise<void> {
  try {
    // Look for .env file in current directory and parent directory
    const envPaths = [
      path.resolve('.env'),
      path.resolve('../.env'),
      path.resolve('../../.env')
    ];

    let envContent = '';
    for (const envPath of envPaths) {
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
        console.log(`✅ Loaded environment from: ${envPath}`);
        break;
      } catch (error) {
        // Continue to next path
      }
    }

    if (!envContent) {
      console.warn(`⚠️ No .env file found in any of the expected locations`);
      return;
    }

    for (const line of envContent.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('='); // Handle values with = in them
        process.env[key.trim()] = value.trim();
      }
    }

    console.log(`✅ Environment variables loaded`);
  } catch (error) {
    console.warn(`⚠️ Error loading .env file:`, error);
  }
}

/**
 * Check prerequisites
 */
async function checkPrerequisites(): Promise<boolean> {
  console.log('🔍 Checking prerequisites...');

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment');
    console.error('Please set it in .env file or environment variable');
    return false;
  }
  console.log('✅ Claude API key found');

  // Check Docker and MCP container
  try {
    const { stdout } = await execAsync('docker ps --filter name=grafana-mcp --format "{{.Names}}"');
    if (!stdout.includes('grafana-mcp')) {
      console.error('❌ Grafana MCP container not running');
      console.error('Please start it: docker-compose up -d');
      return false;
    }
    console.log('✅ Grafana MCP container is running');
  } catch (error) {
    console.error('❌ Error checking Docker containers:', error);
    return false;
  }

  // Check kubectl access
  try {
    await execAsync('kubectl cluster-info');
    console.log('✅ Kubernetes cluster accessible');
  } catch (error) {
    console.error('❌ Kubernetes cluster not accessible:', error);
    return false;
  }

  return true;
}

/**
 * Main entry point
 */
async function main(): Promise<number> {
  console.log('🚀 Starting K8s Resource Optimizer (TypeScript/Claude Agent SDK)');
  console.log('===============================================================');

  await loadEnvironment();

  // Debug: Check if API key was loaded
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    console.log(`✅ API key loaded: ${apiKey.substring(0, 20)}...`);
  } else {
    console.log(`❌ API key not found`);
  }

  // Configuration
  const config: OptimizerConfig = {
    grafana_url: process.env.GRAFANA_URL || 'http://localhost:3000',
    grafana_token: process.env.GRAFANA_TOKEN || '',
    services: ['service-a', 'service-b', 'service-c', 'service-d', 'service-e']  // All services
  };

  // Validate Grafana token
  if (!config.grafana_token) {
    console.error('❌ GRAFANA_TOKEN not found in environment');
    console.error('Please set it in .env file or environment variable');
    return 1;
  }
  console.log(`✅ Grafana token loaded: ${config.grafana_token.substring(0, 20)}...`);

  // Check prerequisites
  if (!(await checkPrerequisites())) {
    return 1;
  }

  // Run optimization
  try {
    const optimizer = new K8sOptimizerSDK(config);
    const results = await optimizer.runOptimizationCycle();

    console.log(`\n🎉 Optimization complete! ${results.length} services analyzed.`);
    return 0;

  } catch (error) {
    console.error(`❌ Optimization failed:`, error);
    return 1;
  }
}

// Run if this is the main module
console.log('🔍 Checking if this is the main module...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// More robust main module detection - handle URL encoding and different paths
const normalizedMetaUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1];

const isMainModule = normalizedMetaUrl === `file://${normalizedArgv}` ||
                    normalizedMetaUrl.endsWith('optimizer.ts') ||
                    normalizedMetaUrl.endsWith('optimizer.js') ||
                    normalizedArgv.endsWith('optimizer.ts') ||
                    normalizedArgv.endsWith('optimizer.js');

if (isMainModule) {
  console.log('🎯 Executing main function...');
  main().then(exitCode => {
    console.log(`🏁 Main function completed with exit code: ${exitCode}`);
    process.exit(exitCode);
  }).catch(error => {
    console.error('💥 Unhandled error in main:', error);
    process.exit(1);
  });
} else {
  console.log('📦 Module loaded but not executed directly');
}