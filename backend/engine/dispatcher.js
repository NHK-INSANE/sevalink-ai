/**
 * SEVALINK AI - AUTONOMOUS DISPATCHER
 * Coordinates classification, routing, and action execution.
 */

const { classifyCrisis, recommendResources } = require("./intelligence");
const { findNearestResponders } = require("./routing");
const { runMultiAgentAnalysis } = require("./agents");
const Conversation = require("../models/Conversation");
const ChatMessage = require("../models/ChatMessage");

/**
 * Main Autonomous Dispatch Flow
 * Crisis -> Analyze -> Decide -> Assign -> Act
 */
async function autoDispatch(crisis, io, userSockets) {
  try {
    console.log(`🧠 AI DISPATCHER: Processing crisis - "${crisis.title}"`);

    // 1. Analyze & Classify (Multi-Agent)
    const { analysis, agentReports } = runMultiAgentAnalysis(crisis);
    const resources = recommendResources(analysis.type);
    
    console.log(`📊 AI ANALYSIS: Type [${analysis.type}] Priority [${analysis.priority}]`);
    console.log(`🤖 AGENT REPORTS: ${agentReports.length} agents active.`);

    // 2. Find Nearest Responders
    const responders = await findNearestResponders(crisis.location, analysis.type);
    const assigned = responders.slice(0, 5); // Take top 5

    // 3. Create Mission Chat Room
    const memberIds = [crisis.userId, ...assigned.map(r => r._id)].filter(id => id);
    
    const missionChat = await Conversation.create({
      members: memberIds,
      lastMessage: `🚨 MISSION STARTED: ${crisis.title}`,
      isMission: true // Adding a flag for frontend distinction
    });

    console.log(`✅ MISSION CREATED: Chat ID [${missionChat._id}] with ${assigned.length} responders`);

    // 4. Act & Notify
    // Notify OPS Command
    io.to("ops_room").emit("ops_event", {
      type: "AI",
      payload: { 
        message: `🧠 AI DISPATCHER: Crisis analyzed. Severity: ${analysis.priority}. Suggestions: ${resources.join(", ")}`,
        crisisTitle: crisis.title,
        isAutoReply: true
      },
      time: new Date()
    });

    io.to("ops_room").emit("ops_event", {
      type: "NEAREST",
      payload: { nearby: assigned, crisisTitle: crisis.title },
      time: new Date()
    });

    // Notify assigned responders via Mission Alert
    memberIds.forEach(mId => {
      const socketId = userSockets.get(mId.toString());
      if (socketId) {
        io.to(socketId).emit("ops_event", {
          type: "MISSION",
          payload: { 
            chatId: missionChat._id, 
            title: crisis.title,
            priority: analysis.priority,
            analysis
          },
          time: new Date()
        });
      }
    });

    // 5. AI Joins and Commands
    setTimeout(async () => {
      const combinedReport = agentReports.join("\n");
      const commandMsg = await ChatMessage.create({
        conversationId: missionChat._id,
        senderId: "AI-COMMAND",
        senderName: "AI COMMAND",
        text: `🧠 AI MULTI-AGENT BRIEFING for "${crisis.title}":\n\n${combinedReport}\n\nRecommended Resources: ${resources.join(", ")}.\n\nMAINTAIN SECURE COMMS.`,
      });

      memberIds.forEach(mId => {
        const socketId = userSockets.get(mId.toString());
        if (socketId) {
          io.to(socketId).emit("chat_message", commandMsg);
        }
      });
    }, 1500);

    return { analysis, assigned, missionChat };

  } catch (err) {
    console.error("Critical Dispatch Failure:", err);
  }
}

module.exports = {
  autoDispatch
};
