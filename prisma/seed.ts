import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo organizations
  const org1 = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
    },
  });

  console.log("✅ Created organizations:", org1.name, org2.name);

  // Create demo users (you'll need to create these users in Supabase Auth first)
  const user1 = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001", // Replace with actual Supabase UUID
      email: "demo@example.com",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "admin@acme.com" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002", // Replace with actual Supabase UUID
      email: "admin@acme.com",
    },
  });

  console.log("✅ Created users:", user1.email, user2.email);

  // Create memberships
  const membership1 = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user1.id,
        organizationId: org1.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      organizationId: org1.id,
      role: "OWNER",
    },
  });

  const membership2 = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user2.id,
        organizationId: org2.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      organizationId: org2.id,
      role: "OWNER",
    },
  });

  console.log("✅ Created memberships");

  // Create demo campaigns for each org
  const campaign1 = await prisma.campaign.create({
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
      organizationId: org1.id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: "Healthcare Provider Survey",
      category: "Healthcare",
      checklistId: "checklist-healthcare-001",
      promptTemplate: `You are conducting a channel check call with a healthcare provider.
Ask about:
- Patient volume trends
- Staffing challenges
- Equipment availability
- Insurance reimbursement issues

Be professional and conversational.`,
      status: "DRAFT",
      organizationId: org2.id,
    },
  });

  console.log("✅ Created campaigns:", campaign1.name, campaign2.name);

  // Create sample hypotheses for campaign1
  const hypothesis1 = await prisma.hypothesis.create({
    data: {
      campaignId: campaign1.id,
      question: "Are inventory levels higher than last quarter?",
      status: "PENDING",
    },
  });

  const hypothesis2 = await prisma.hypothesis.create({
    data: {
      campaignId: campaign1.id,
      question: "Are customers reporting supply chain delays?",
      status: "PENDING",
    },
  });

  // Create sample hypotheses for campaign2
  const hypothesis3 = await prisma.hypothesis.create({
    data: {
      campaignId: campaign2.id,
      question: "Are patient volumes increasing?",
      status: "PENDING",
    },
  });

  console.log("✅ Created hypotheses");

  console.log("🎉 Seeding complete!");
  console.log("\n📋 Summary:");
  console.log(`  - Organizations: ${org1.name}, ${org2.name}`);
  console.log(`  - Users: ${user1.email}, ${user2.email}`);
  console.log(`  - Memberships: 2`);
  console.log(`  - Campaigns: 2`);
  console.log(`  - Hypotheses: 3`);
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

