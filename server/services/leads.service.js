// server/services/leads.service.js
const leadsRepo = require("../repositories/leads.repo");
const AppError = require("../utils/AppError");

const VALID_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

const VALID_TRANSITIONS = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["converted", "lost"],
  converted: [],
  lost: [],
};

// async function getLead(id) {
//   const lead = await leadsRepo.findById(id);
//   if (!lead) throw new AppError("Lead not found", 404);
//   return lead;
// }

// async function listLeads(filters) {
//   return leadsRepo.list(filters);
// }

// async function changeStatus(id, nextStatus) {
//   if (!VALID_STATUSES.includes(nextStatus)) {
//     throw new AppError(`Invalid status: ${nextStatus}`, 400);
//   }
//   const lead = await getLead(id);
//   const allowed = VALID_TRANSITIONS[lead.status];
//   if (!allowed.includes(nextStatus)) {
//     throw new AppError(
//       `Cannot move from ${lead.status} to ${nextStatus}`,
//       409
//     );
//   }
//   return leadsRepo.updateStatus(id, nextStatus);
// }

// async function getStats() {
//   const rows = await leadsRepo.statsByStatus();
//   const total = rows.reduce((sum, r) => sum + r.total, 0);
//   return { total, byStatus: rows };
// }

async function listForUser(user, filters) {
  if (user.role === "admin") {
    return leadsRepo.list(filters);
  }
  // Agents see their own + (if explicitly asked) unassigned
  if (filters.assignedTo === "unassigned") {
    return leadsRepo.list({ ...filters, assignedTo: "unassigned" });
  }
  return leadsRepo.list({ ...filters, assignedTo: user.id });
}

async function getLeadForUser(user, id) {
  const lead = await leadsRepo.findById(id);
  if (!lead) throw new AppError("Lead not found", 404);

  if (user.role !== "admin" && lead.assigned_to && lead.assigned_to !== user.id) {
    throw new AppError("Lead not found", 404);
  }
  return lead;
}

async function claimLead(user, id) {
  const lead = await leadsRepo.findById(id);
  if (!lead) throw new AppError("Lead not found", 404);
  if (lead.assigned_to) {
    throw new AppError("Lead is already assigned", 409);
  }
  return leadsRepo.assign(id, user.id);
}

async function reassignLead(user, id, newOwnerId) {
  if (user.role !== "admin") {
    throw new AppError("Only admins can reassign leads", 403);
  }
  const lead = await leadsRepo.findById(id);
  if (!lead) throw new AppError("Lead not found", 404);
  return leadsRepo.assign(id, newOwnerId); // null means unassign
}

async function changeStatus(user, id, nextStatus) {
  const lead = await getLeadForUser(user, id); // enforces visibility
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new AppError(`Invalid status: ${nextStatus}`, 400);
  }
  const allowed = VALID_TRANSITIONS[lead.status];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(`Cannot move from ${lead.status} to ${nextStatus}`, 409);
  }
  return leadsRepo.updateStatus(id, nextStatus);
}

module.exports = {
  listForUser,
  getLeadForUser,
  claimLead,
  reassignLead,
  changeStatus,
  getStats: async (user) => {
    // Stats are admin-only for now. Agents see their own numbers tomorrow.
    if (user.role !== "admin") {
      throw new AppError("Admins only", 403);
    }
    const rows = await leadsRepo.statsByStatus();
    const total = rows.reduce((sum, r) => sum + r.total, 0);
    return { total, byStatus: rows };
  },
};

// module.exports = { getLead, listLeads, changeStatus, getStats };