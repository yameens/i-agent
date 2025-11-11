"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

export interface Signal {
  id: string;
  claim: string;
  sku?: string;
  geo?: string;
  field?: string;
  confidence: number;
  validated: boolean;
  timestamp: number;
  callId: string;
  phoneNumber: string;
  evidenceUrl?: string;
  hypothesis?: string;
  campaign?: string;
}

interface SignalsTableProps {
  signals: Signal[];
  onSignalClick?: (signal: Signal) => void;
  isLoading?: boolean;
  className?: string;
}

export function SignalsTable({
  signals,
  onSignalClick,
  isLoading,
  className,
}: SignalsTableProps) {
  const [skuFilter, setSkuFilter] = useState<string>("all");
  const [geoFilter, setGeoFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");

  // Extract unique values for filters
  const { skus, geos, fields } = useMemo(() => {
    const skuSet = new Set<string>();
    const geoSet = new Set<string>();
    const fieldSet = new Set<string>();

    signals.forEach((signal) => {
      if (signal.sku) skuSet.add(signal.sku);
      if (signal.geo) geoSet.add(signal.geo);
      if (signal.field) fieldSet.add(signal.field);
    });

    return {
      skus: Array.from(skuSet).sort(),
      geos: Array.from(geoSet).sort(),
      fields: Array.from(fieldSet).sort(),
    };
  }, [signals]);

  // Filter signals
  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      if (skuFilter !== "all" && signal.sku !== skuFilter) return false;
      if (geoFilter !== "all" && signal.geo !== geoFilter) return false;
      if (fieldFilter !== "all" && signal.field !== fieldFilter) return false;
      return true;
    });
  }, [signals, skuFilter, geoFilter, fieldFilter]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signal</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Geo</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-full max-w-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className={cn("border rounded-lg p-12 text-center", className)}>
        <div className="flex flex-col items-center gap-2">
          <Filter className="h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-ink">No signals found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Signals will appear here once calls are completed and claims are extracted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-40">
          <Select value={skuFilter} onValueChange={setSkuFilter}>
            <SelectTrigger>
              <SelectValue placeholder="SKU" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All SKUs</SelectItem>
              {skus.map((sku) => (
                <SelectItem key={sku} value={sku}>
                  {sku}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select value={geoFilter} onValueChange={setGeoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Geography" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Geos</SelectItem>
              {geos.map((geo) => (
                <SelectItem key={geo} value={geo}>
                  {geo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {fields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(skuFilter !== "all" || geoFilter !== "all" || fieldFilter !== "all") && (
          <button
            onClick={() => {
              setSkuFilter("all");
              setGeoFilter("all");
              setFieldFilter("all");
            }}
            className="text-sm text-brand hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {filteredSignals.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No signals match the selected filters.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-ink">Signal</TableHead>
                <TableHead className="font-semibold text-ink">SKU</TableHead>
                <TableHead className="font-semibold text-ink">Geo</TableHead>
                <TableHead className="font-semibold text-ink">Field</TableHead>
                <TableHead className="font-semibold text-ink">Confidence</TableHead>
                <TableHead className="font-semibold text-ink">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSignals.map((signal) => (
                <TableRow
                  key={signal.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSignalClick?.(signal)}
                >
                  <TableCell className="max-w-md">
                    <div className="text-sm text-ink line-clamp-2">
                      {signal.claim}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {signal.phoneNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink">
                      {signal.sku || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink">
                      {signal.geo || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink">
                      {signal.field || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        signal.confidence >= 0.8
                          ? "border-green-500 text-green-700 bg-green-50"
                          : signal.confidence >= 0.6
                          ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                          : "border-gray-500 text-gray-700 bg-gray-50"
                      )}
                    >
                      {(signal.confidence * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        signal.validated
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {signal.validated ? "Validated" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSignals.length} of {signals.length} signals
      </div>
    </div>
  );
}

