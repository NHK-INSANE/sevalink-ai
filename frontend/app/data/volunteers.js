export const volunteers = [
  { id: 1, name: "Rahul Sharma", skill: "Medical Aid", location: "Kolkata" },
  { id: 2, name: "Anita Das", skill: "Education", location: "Kharagpur" },
  { id: 3, name: "Ravi Kumar", skill: "Food Supply", location: "Medinipur" },
  { id: 4, name: "Priya Singh", skill: "Engineering", location: "Howrah" },
  { id: 5, name: "Deepak Rao", skill: "Logistics", location: "Durgapur" },
  { id: 6, name: "Sunita Patel", skill: "Social Work", location: "Asansol" },
  { id: 7, name: "Amit Verma", skill: "IT Support", location: "Siliguri" },
  { id: 8, name: "Kavya Nair", skill: "Legal Aid", location: "Kolkata" },
  { id: 9, name: "Mohan Reddy", skill: "Medical Aid", location: "Burdwan" },
  { id: 10, name: "Sneha Joshi", skill: "Food Supply", location: "Haldia" },
];

/**
 * Returns volunteers whose skill matches the requiredSkill (case-insensitive, partial).
 */
export const matchVolunteers = (requiredSkill) => {
  if (!requiredSkill) return [];
  return volunteers.filter((v) =>
    v.skill.toLowerCase().includes(requiredSkill.toLowerCase()) ||
    requiredSkill.toLowerCase().includes(v.skill.toLowerCase().split(" ")[0])
  );
};
