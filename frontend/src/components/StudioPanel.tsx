import { useMemo, useState } from "react";
import { AgStudio } from "ag-studio-react";
import type { DashboardData } from "../types";
import {
  STUDIO_PRESETS,
  buildStudioData,
  buildStudioState,
  type StudioPreset,
} from "../studioConfig";
import { paypalStudioTheme } from "../paypalTheme";
import { ErrorBoundary } from "./ErrorBoundary";

interface StudioPanelProps {
  data: DashboardData;
  dataKey: string;
}

export function StudioPanel({ data, dataKey }: StudioPanelProps) {
  const [preset, setPreset] = useState<StudioPreset>("executive");
  const studioData = useMemo(() => buildStudioData(data), [data]);
  const initialState = useMemo(() => buildStudioState(preset), [preset]);

  return (
    <section
      data-film-panel="StudioPanel"
      className="min-w-0 overflow-hidden border border-[#E2E0D8] bg-[#FCFBF9]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E0D8] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              01
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Receivables intelligence
            </h2>
            <span className="border border-[#E2E0D8] bg-[#F6F5F2] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#475569]">
              AG Studio 3.1
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Live AG Studio view of invoices, customers, subscriptions, and cashflow.
          </p>
          <p
            data-film-provenance="calculated-fields"
            className="mt-1 font-mono text-[9px] leading-4 text-[#64748B]"
          >
            Calculated fields: Collection rate (calculated) / Outstanding balance
            (calculated)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div data-tour-id="studio-presets" className="flex border border-[#D3D0C5] bg-[#F6F5F2]">
            {STUDIO_PRESETS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-film-preset={option.id}
                aria-pressed={preset === option.id}
                onClick={() => setPreset(option.id)}
                className={`border-r border-[#D3D0C5] px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] last:border-r-0 ${
                  preset === option.id
                    ? "bg-[#001C64] text-[#FCFBF9]"
                    : "text-[#475569] hover:bg-[#FCFBF9] hover:text-[#001C64]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="border border-[#E2E0D8] bg-[#FCFBF9] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
            View mode / drag to filter
          </span>
        </div>
      </div>

      <div
        data-tour-id="studio-canvas"
        className="max-h-[880px] overflow-auto bg-[#F6F5F2] p-1 sm:p-2"
        aria-label="AG Studio receivables canvas"
      >
        <div className="h-[1120px] min-w-[760px]">
          <ErrorBoundary>
            <AgStudio
              key={`${dataKey}-${preset}`}
              data={studioData}
              initialState={initialState}
              mode="view"
              theme={paypalStudioTheme}
              style={{ height: "100%", width: "100%" }}
            />
          </ErrorBoundary>
        </div>
      </div>
    </section>
  );
}
