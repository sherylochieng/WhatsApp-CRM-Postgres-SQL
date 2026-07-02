// // // client/src/services/api.js
// // import axios from "axios";
// // const BASE = "http://localhost:5000/api";

// // const http = axios.create({
// //   baseURL: BASE,
// // });

// // export async function listLeads({ search = "", status = "", page = 1 } = {}) {
// //   const { data } = await http.get("/leads", {
// //     params: { search, status, page, pageSize: 25 },
// //   });
// //   return data;
// // }

// // export async function getLead(id) {
// //   const { data } = await http.get(`/leads/${id}`);
// //   return data;
// // }

// // export async function updateLead(id, patch) {
// //   const { data } = await http.patch(`/leads/${id}`, patch);
// //   return data;
// // }

// // export async function getStats() {
// //   const { data } = await http.get("/stats");
// //   return data;
// // }

// // export async function api(path, options = {}) {
// //   const token = localStorage.getItem("token");
// //   const res = await fetch(`${BASE}${path}`, {
// //     ...options,
// //     headers: {
// //       "Content-Type": "application/json",
// //       ...(token ? { Authorization: `Bearer ${token}` } : {}),
// //       ...options.headers,
// //     },
// //   });

// //   if (res.status === 401) {
// //     localStorage.removeItem("token");
// //     localStorage.removeItem("user");
// //     window.location.href = "/login";
// //     throw new Error("Not authenticated");
// //   }

// //   const data = await res.json();
// //   if (!res.ok) {
// //     throw new Error(data.error?.message || `HTTP ${res.status}`);
// //   }
// //   return data;
// // }

// //

// //UPDATE 3

// // client/src/services/api.js
// import axios from 'axios';

// const BASE = 'http://localhost:5000/api';

// const http = axios.create({
//   baseURL: BASE,
// });

// // Attach token to every request
// http.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Handle 401 globally
// http.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   },
// );

// // UPDATED: added assignedTo param (default "") so Dashboard.js's new filter
// // selector (mine/unassigned/all) can actually be sent to the backend.
// export async function listLeads({
//   search = '',
//   status = '',
//   assignedTo = '',
//   page = 1,
// } = {}) {
//   const { data } = await http.get('/leads', {
//     params: { search, status, assignedTo, page, pageSize: 25 }, // UPDATED: assignedTo added here
//   });
//   return data;
// }

// export async function getLead(id) {
//   const { data } = await http.get(`/leads/${id}`);
//   return data.lead; // unwrap it here;
// }

// export async function updateLead(id, patch) {
//   const { data } = await http.patch(`/leads/${id}`, patch);
//   return data;
// }

// export async function getStats() {
//   const { data } = await http.get('/stats');
//   return data;
// }

// // ADDED: needed for the Claim button in LeadDetail.js
// export async function claimLead(id) {
//   const { data } = await http.post(`/leads/${id}/claim`);
//   return data;
// }

// // ADDED: needed for the admin reassign dropdown in LeadDetail.js
// export async function assignLead(id, userId) {
//   const { data } = await http.patch(`/leads/${id}/assign`, {
//     assignedTo: userId,
//   });
//   return data;
// }

// // ADDED: needed so the admin reassign dropdown can list available agents
// export async function listUsers() {
//   const { data } = await http.get('/users');
//   return data;
// }

 
// client/src/services/api.js
import axios from "axios";
 
const BASE = "http://localhost:5000/api";
 
const http = axios.create({
  baseURL: BASE,
});
 
// Attach token to every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
 
// Handle 401 globally
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
 
// UPDATED: added assignedTo param (default "") so Dashboard.js's filter
// selector (mine/unassigned/all) can be sent to the backend.
// NOT wrapped here -- GET /api/leads returns { leads: [...] } and Dashboard.js
// already does data.leads itself, so this one was correct as-is.
export async function listLeads({ search = "", status = "", assignedTo = "", page = 1 } = {}) {
  const { data } = await http.get("/leads", {
    params: { search, status, assignedTo, page, pageSize: 25 },
  });
  return data;
}
 
// FIXED: backend's getOne controller sends { lead: {...} }, but this used to
// return the whole envelope instead of unwrapping it. That meant lead.name,
// lead.wa_phone, lead.assigned_to etc were all undefined in LeadDetail.js --
// specifically, lead.assigned_to === null never matched (it was undefined),
// which is why the Claim button never appeared. Fixed by returning data.lead.
export async function getLead(id) {
  const { data } = await http.get(`/leads/${id}`);
  return data.lead;
}
 
// FIXED: two bugs here.
// 1) Path was `/leads/:id`, but the backend only has PATCH /leads/:id/status
//    (see leads.routes.js) -- the old path would 404.
// 2) Same unwrap issue as getLead: patchStatus controller sends { lead: {...} },
//    so this needs to return data.lead, not the raw envelope, otherwise
//    LeadDetail.js's setLead((prev) => ({ ...prev, ...updated })) was spreading
//    a stray `lead` key onto state instead of the actual updated fields.
export async function updateLead(id, patch) {
  const { data } = await http.patch(`/leads/${id}/status`, patch);
  return data.lead;
}
 
// FIXED: was calling /stats, but the real route is /leads/stats (it's mounted
// inside leads.routes.js, not as a standalone top-level route). This was
// causing the "Stats error: Request failed with status code 404" banner.
// getStats's response is NOT wrapped (controller does res.json(data) directly,
// no { stats: ... } envelope), so no unwrap needed here -- just the path.
export async function getStats() {
  const { data } = await http.get("/leads/stats");
  return data;
}
 
// ADDED: needed for the Claim button in LeadDetail.js.
// NOTE: backend's claim controller also sends { lead: {...} }, so technically
// this should also return data.lead for consistency -- but LeadDetail.js
// currently ignores the return value entirely (it just calls onUpdated?.()
// to trigger a full refetch), so it's harmless as-is. Worth fixing later
// if anything ever reads this function's return value directly.
export async function claimLead(id) {
  const { data } = await http.post(`/leads/${id}/claim`);
  return data;
}
 
// ADDED: needed for the admin reassign dropdown in LeadDetail.js.
// Same note as claimLead above -- return value currently unused by the caller,
// so the unwrap mismatch is harmless for now but worth knowing about.
export async function assignLead(id, userId) {
  const { data } = await http.patch(`/leads/${id}/assign`, { assignedTo: userId });
  return data;
}
 
// ADDED: needed so the admin reassign dropdown can list available agents.
// GET /api/users returns { users: [...] }, and LeadDetail.js correctly does
// data.users on the result, so no unwrap needed here -- envelope expected
// and envelope received.
export async function listUsers() {
  const { data } = await http.get("/users");
  return data;
}