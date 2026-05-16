import { prisma } from "@/lib/db";
import { JobType } from "@prisma/client";

export async function isJobRunningRecently(businessId: string, type: JobType, seconds = 120) {
  const since = new Date(Date.now() - seconds * 1000);

  const running = await prisma.jobRun.findFirst({
    where: {
      businessId,
      type,
      status: "running",
      startedAt: { gte: since },
    },
    select: { id: true },
  });

  return Boolean(running);
}