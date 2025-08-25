import {
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Briefcase,
  Car,
  Smartphone,
  Building,
} from "lucide-react";

// Category icon mapping function
export const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();

  if (
    cat.includes("healthcare") ||
    cat.includes("medical") ||
    cat.includes("health")
  ) {
    return Stethoscope;
  }
  if (
    cat.includes("beauty") ||
    cat.includes("wellness") ||
    cat.includes("spa")
  ) {
    return Scissors;
  }
  if (
    cat.includes("fitness") ||
    cat.includes("gym") ||
    cat.includes("workout")
  ) {
    return Dumbbell;
  }
  if (
    cat.includes("home") ||
    cat.includes("cleaning") ||
    cat.includes("repair")
  ) {
    return Home;
  }
  if (cat.includes("business") || cat.includes("professional")) {
    return Briefcase;
  }
  if (cat.includes("automotive") || cat.includes("car")) {
    return Car;
  }
  if (cat.includes("technology") || cat.includes("tech")) {
    return Smartphone;
  }

  // Default icon
  return Building;
};

// Category color mapping function - consistent with filter cards
export const getCategoryColor = (category: string) => {
  const cat = category.toLowerCase();

  if (
    cat.includes("beauty") ||
    cat.includes("wellness") ||
    cat.includes("spa")
  ) {
    return "bg-gradient-to-r from-pink-500 to-rose-500";
  }
  if (
    cat.includes("fitness") ||
    cat.includes("gym") ||
    cat.includes("workout")
  ) {
    return "bg-gradient-to-r from-orange-500 to-red-500";
  }
  if (
    cat.includes("therapy") ||
    cat.includes("therapeutic") ||
    cat.includes("massage")
  ) {
    return "bg-gradient-to-r from-green-500 to-emerald-500";
  }
  if (
    cat.includes("healthcare") ||
    cat.includes("medical") ||
    cat.includes("health")
  ) {
    return "bg-gradient-to-r from-blue-500 to-cyan-500";
  }

  // Default gradient
  return "bg-gradient-to-r from-gray-500 to-gray-600";
};

// Category mapping for filtering
export const categoryMapping = {
  all: [],
  beauty: ["beauty", "wellness", "spa", "salon", "cosmetic"],
  fitness: ["fitness", "gym", "workout", "exercise", "training"],
  therapy: ["therapy", "therapeutic", "massage", "counseling"],
  healthcare: ["healthcare", "medical", "health", "dental", "vision"],
};
