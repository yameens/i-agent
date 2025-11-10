import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
    },
  });

  console.log("✅ Created organization:", org.name);

  // Create a demo user (you'll need to create this user in Supabase Auth first)
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000000", // Replace with actual Supabase UUID
      email: "demo@example.com",
      role: "OWNER",
      organizationId: org.id,
    },
  });

  console.log("✅ Created user:", user.email);

  // Create a demo campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: "Retail Channel Check Q4",
      category: "Retail",
      checklistId: "checklist-retail-001",
      promptTemplate: `You are conducting a channel check call with a retail store manager.
Ask about:
- Current inventory levels
- Sales trends
- Customer feedback
- Supply chain issues

Be professional and conversational.`,
      status: "DRAFT",
      organizationId: org.id,
    },
  });

  console.log("✅ Created campaign:", campaign.name);

  // Create sample hypotheses
  const hypothesis1 = await prisma.hypothesis.create({
    data: {
      campaignId: campaign.id,
      question: "Are inventory levels higher than last quarter?",
      status: "PENDING",
    },
  });

  const hypothesis2 = await prisma.hypothesis.create({
    data: {
      campaignId: campaign.id,
      question: "Are customers reporting supply chain delays?",
      status: "PENDING",
    },
  });

  console.log("✅ Created hypotheses");

  console.log("🎉 Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

