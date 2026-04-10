import type { StatsData, UserRecord } from "@/types/dashboard";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_STATS: StatsData[] = [
  {
    id: "1",
    title: "Total Users",
    value: "12,458",
    change: 12.5,
    changeType: "increase",
    icon: "Users",
  },
  {
    id: "2",
    title: "Revenue",
    value: "$48,352",
    change: 8.2,
    changeType: "increase",
    icon: "DollarSign",
  },
  {
    id: "3",
    title: "Orders",
    value: "2,845",
    change: 3.1,
    changeType: "decrease",
    icon: "ShoppingCart",
  },
  {
    id: "4",
    title: "Active Sessions",
    value: "1,024",
    change: 18.7,
    changeType: "increase",
    icon: "Activity",
  },
];

const ROLES = ["Admin", "Editor", "Viewer"];
const STATUSES: ("active" | "inactive")[] = ["active", "inactive"];
const FIRST_NAMES = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Christopher",
  "Karen",
  "Charles",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
];
const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
];

function generateMockUsers(count: number): UserRecord[] {
  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const year = 2023 + Math.floor(Math.random() * 3);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");

    return {
      id: String(i + 1),
      name,
      email,
      role: ROLES[i % ROLES.length],
      status: STATUSES[i % 2],
      joinedAt: `${year}-${month}-${day}`,
    };
  });
}

const MOCK_USERS = generateMockUsers(50);

export const dashboardService = {
  async getStats(): Promise<StatsData[]> {
    await delay(500);
    return MOCK_STATS;
  },

  async getUsers(): Promise<UserRecord[]> {
    await delay(700);
    return MOCK_USERS;
  },
};
