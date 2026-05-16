export type ExternalReview = {
  source: "google" | "mock";
  externalId: string;
  rating: number;
  authorName?: string | null;
  comment?: string | null;
  createdAtGoogle?: Date | null;
};

export async function fetchMockReviews(): Promise<ExternalReview[]> {
  const now = Date.now();

  return [
    {
      source: "mock",
      externalId: "mock-001",
      rating: 5,
      authorName: "Ana",
      comment: "Ótimo atendimento!",
      createdAtGoogle: new Date(now - 1000 * 60 * 60 * 24),
    },
    {
      source: "mock",
      externalId: "mock-002",
      rating: 2,
      authorName: "Bruno",
      comment: "Demorou muito",
      createdAtGoogle: new Date(now - 1000 * 60 * 60 * 48),
    },
  ];
}