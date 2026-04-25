/**
 * SEVALINK AI - MULTI-AGENT SYSTEM
 * Specialized agents for different aspects of crisis management.
 */

const { classifyCrisis } = require("./intelligence");

/**
 * Dispatcher Agent: Focuses on personnel and assignments.
 */
function dispatcherAgent(crisis, analysis) {
  const urgency = analysis.priority;
  if (urgency === "CRITICAL") {
    return "🚨 DISPATCHER: Critical priority. Deploying all nearest units. Bypassing standard queue.";
  }
  return `✅ DISPATCHER: Standard deployment initiated for ${analysis.type} report.`;
}

/**
 * Medical Agent: Focuses on casualty care and health logistics.
 */
function medicalAgent(crisis, analysis) {
  if (analysis.type !== "MEDICAL" && !crisis.description?.toLowerCase().includes("injured")) {
    return null;
  }
  return "🚑 MEDICAL: Alerting nearest Trauma Centers. Preparing casualty intake protocols. Ensure units carry basic life support kits.";
}

/**
 * Logistics Agent: Focuses on routing and environmental hazards.
 */
function logisticsAgent(crisis, analysis) {
  // Simulating routing logic
  return "📍 LOGISTICS: Optimal route calculated. Avoiding secondary road blockages. Estimated arrival time reduced by 15% via priority lanes.";
}

/**
 * Communication Agent: Focuses on public safety and NGO alerts.
 */
function commsAgent(crisis, analysis) {
  if (analysis.priority === "CRITICAL" || analysis.priority === "HIGH") {
    return "📢 COMMS: Broadcasting emergency alerts to all NGOs within 5km radius. Notifying local authorities.";
  }
  return "💬 COMMS: Logging event in public database. Maintaining standard mission monitoring.";
}

/**
 * Main Multi-Agent Brain
 */
function runMultiAgentAnalysis(crisis) {
  const analysis = classifyCrisis(crisis.description || crisis.message || "");
  
  const reports = [
    dispatcherAgent(crisis, analysis),
    medicalAgent(crisis, analysis),
    logisticsAgent(crisis, analysis),
    commsAgent(crisis, analysis)
  ].filter(msg => msg !== null);

  return {
    analysis,
    agentReports: reports
  };
}

module.exports = {
  runMultiAgentAnalysis,
  dispatcherAgent,
  medicalAgent,
  logisticsAgent,
  commsAgent
};
