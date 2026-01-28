"use client";

import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export interface DealFilterValues {
    search: string;
    stage: string;
    minValue: string;
    maxValue: string;
    minProbability: string;
    maxProbability: string;
}

interface DealFiltersProps {
    stages: { id: string; name: string }[];
    onFilterChange: (filters: DealFilterValues) => void;
    currentFilters: DealFilterValues;
}

export function DealFilters({ stages, onFilterChange, currentFilters }: DealFiltersProps) {
    const [tempFilters, setTempFilters] = useState<DealFilterValues>(currentFilters);

    const handleApply = () => {
        onFilterChange(tempFilters);
    };

    const handleClear = () => {
        const clearedFilters = {
            search: "",
            stage: "all",
            minValue: "",
            maxValue: "",
            minProbability: "",
            maxProbability: "",
        };
        setTempFilters(clearedFilters);
        onFilterChange(clearedFilters);
    };

    const activeFilterCount = Object.entries(currentFilters).reduce((count, [key, value]) => {
        if (key === "stage") return value !== "all" ? count + 1 : count;
        return value !== "" ? count + 1 : count;
    }, 0);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none">Filters</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={handleClear}
                        >
                            <X className="mr-2 h-3 w-3" />
                            Clear All
                        </Button>
                    </div>
                    <Separator />

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search Name</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Deal name..."
                                    className="pl-8 h-9"
                                    value={tempFilters.search}
                                    onChange={(e) => setTempFilters({ ...tempFilters, search: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Stage</Label>
                            <Select
                                value={tempFilters.stage}
                                onValueChange={(value) => setTempFilters({ ...tempFilters, stage: value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Value Range ($)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    className="h-9"
                                    value={tempFilters.minValue}
                                    onChange={(e) => setTempFilters({ ...tempFilters, minValue: e.target.value })}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    className="h-9"
                                    value={tempFilters.maxValue}
                                    onChange={(e) => setTempFilters({ ...tempFilters, maxValue: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Probability Range (%)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min %"
                                    className="h-9"
                                    min="0"
                                    max="100"
                                    value={tempFilters.minProbability}
                                    onChange={(e) => setTempFilters({ ...tempFilters, minProbability: e.target.value })}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max %"
                                    className="h-9"
                                    min="0"
                                    max="100"
                                    value={tempFilters.maxProbability}
                                    onChange={(e) => setTempFilters({ ...tempFilters, maxProbability: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <Button className="w-full h-9" onClick={handleApply}>
                        Apply Filters
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
