import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Set mock environment variable
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_MOCKS = "true";
});

// Mock tRPC
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    campaign: {
      list: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
    },
    insight: {
      listValidatedClaims: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
      listHypotheses: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
    },
    calls: {
      getById: {
        useQuery: () => ({
          data: null,
          isLoading: false,
        }),
      },
    },
  },
}));

describe("InsightsPage Mocks Test", () => {
  it("renders with NEXT_PUBLIC_USE_MOCKS=true", async () => {
    const InsightsPage = (await import("../page")).default;
    render(<InsightsPage />);

    // Check for page title
    expect(screen.getByText(/This Week's Signals/i)).toBeInTheDocument();
  });

  it("shows chart wrappers when mocks enabled", async () => {
    const InsightsPage = (await import("../page")).default;
    render(<InsightsPage />);

    // Check for chart titles
    expect(screen.getByText("Velocity Index")).toBeInTheDocument();
    expect(screen.getByText("Promo Depth %")).toBeInTheDocument();
    expect(screen.getByText("Stockout Rate %")).toBeInTheDocument();
    expect(screen.getByText("BOPIS Share %")).toBeInTheDocument();
  });

  it("shows two tables with mock data", async () => {
    const InsightsPage = (await import("../page")).default;
    render(<InsightsPage />);

    // Check for table headings
    expect(screen.getByText("Top Movers")).toBeInTheDocument();
    expect(screen.getByText("Coverage")).toBeInTheDocument();
  });
});

