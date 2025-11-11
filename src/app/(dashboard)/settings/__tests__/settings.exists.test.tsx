import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("SettingsPage Exists Test", () => {
  it("renders the settings page", async () => {
    const SettingsPage = (await import("../page")).default;
    render(<SettingsPage />);

    // Check for page title
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders all three tab headings", async () => {
    const SettingsPage = (await import("../page")).default;
    render(<SettingsPage />);

    // Check for tab triggers
    expect(screen.getByRole("tab", { name: /Organization/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Schedules/i })).toBeInTheDocument();
  });

  it("shows organization details by default", async () => {
    const SettingsPage = (await import("../page")).default;
    render(<SettingsPage />);

    // Check for organization content
    expect(screen.getByText("Organization Details")).toBeInTheDocument();
  });
});

