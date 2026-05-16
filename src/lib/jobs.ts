import { prisma } from "@/lib/db";
import { JobType } from "@prisma/client";

export async function startJob(businessId: string, type: JobType) {
  return prisma.jobRun.create({
    data: {
      businessId,
      type,
      status: "running",
    },
  });
}

export async function finishJobSuccess(jobId: string, data: {
  processed?: number;
  responded?: number;
  skipped?: number;
}) {
  return prisma.jobRun.update({
    where: { id: jobId },
    data: {
      status: "success",
      finishedAt: new Date(),
      processed: data.processed ?? 0,
      responded: data.responded ?? 0,
      skipped: data.skipped ?? 0,
    },
  });
}

export async function finishJobFailed(jobId: string, error: string) {
  return prisma.jobRun.update({
    where: { id: jobId },
    data: {
      status: "failed",
      finishedAt: new Date(),
      error,
    },
  });
}