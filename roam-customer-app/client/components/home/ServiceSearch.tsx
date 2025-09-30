import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Car,
  Building,
  Video,
  X,
  Stethoscope,
  Scissors,
  Dumbbell,
  Home,
  Briefcase,
  Smartphone,
} from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface ServiceSearchProps {
  searchQuery: string;
  selectedCategory: string;
  selectedDelivery: string;
  serviceCategories: ServiceCategory[];
  onSearchChange: (query: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onDeliveryChange: (delivery: string) => void;
  onResetFilters: () => void;
}

export const ServiceSearch: React.FC<ServiceSearchProps> = ({
  searchQuery,
  selectedCategory,
  selectedDelivery,
  serviceCategories,
  onSearchChange,
  onCategorySelect,
  onDeliveryChange,
  onResetFilters,
}) => {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-roam-light-blue/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Services by <span className="text-roam-blue">Category</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Browse our comprehensive range of professional services or search for exactly what you need
          </p>
        </div>

        {/* Mobile Category Selector */}
        <div className="md:hidden mb-8 max-w-md mx-auto">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/20 to-roam-light-blue/20 rounded-2xl blur-sm group-focus-within:blur-0 transition-all duration-300"></div>
            <div className="relative">
              <Select value={selectedCategory} onValueChange={onCategorySelect}>
                <SelectTrigger className="h-16 border-0 rounded-2xl bg-white shadow-xl group-focus-within:shadow-2xl transition-all text-lg">
                  <div className="flex items-center gap-3 py-2">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${
                        selectedCategory === "all"
                          ? "from-gray-500 to-gray-600"
                          : serviceCategories.find((cat) => cat.id === selectedCategory)?.color ||
                            "from-gray-500 to-gray-600"
                      } rounded-xl flex items-center justify-center`}
                    >
                      {selectedCategory === "all" ? (
                        <Filter className="w-6 h-6 text-white" />
                      ) : (
                        React.createElement(
                          serviceCategories.find((cat) => cat.id === selectedCategory)?.icon || Filter,
                          { className: "w-6 h-6 text-white" }
                        )
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">
                        {selectedCategory === "all"
                          ? "All Categories"
                          : selectedCategory === "therapy"
                          ? "Therapy"
                          : selectedCategory === "fitness"
                          ? "Fitness"
                          : selectedCategory === "beauty"
                          ? "Beauty"
                          : serviceCategories.find((cat) => cat.id === selectedCategory)?.name ||
                            selectedCategory}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tap to change category
                      </div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  <SelectItem value="all" className="rounded-xl m-1">
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">All Categories</div>
                        <div className="text-xs text-gray-500">
                          Browse everything
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  {serviceCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="rounded-xl m-1"
                    >
                      <div className="flex items-center gap-3 py-2">
                        <div
                          className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}
                        >
                          <category.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {category.id === "therapy"
                              ? "Therapy"
                              : category.id === "fitness"
                                ? "Fitness"
                                : category.id === "beauty"
                                  ? "Beauty"
                                  : category.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {category.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Desktop Category Cards */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-8 mb-16">
          {/* All Categories Option */}
          <div
            className={`group cursor-pointer transition-all duration-500 hover:-translate-y-4 ${
              selectedCategory === "all" ? "scale-105" : ""
            }`}
            onClick={() => onCategorySelect("all")}
          >
            <div
              className={`relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 ${
                selectedCategory === "all"
                  ? "ring-4 ring-roam-blue/30 bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5"
                  : ""
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 via-transparent to-gray-600/5"></div>
              <div className="relative p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-gray-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                  <Filter className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-roam-blue transition-colors">
                  All Categories
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Browse all available services
                </p>
                {selectedCategory === "all" && (
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 bg-roam-blue rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {serviceCategories.map((category) => (
            <div
              key={category.id}
              className={`group cursor-pointer transition-all duration-500 hover:-translate-y-4 ${
                selectedCategory === category.id ? "scale-105" : ""
              }`}
              onClick={() => onCategorySelect(category.id)}
            >
              <div
                className={`relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 ${
                  selectedCategory === category.id
                    ? "ring-4 ring-roam-blue/30 bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5"
                    : ""
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent opacity-50"></div>
                <div className="relative p-8 text-center">
                  <div
                    className={`w-20 h-20 bg-gradient-to-br ${category.color} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}
                  >
                    <category.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-roam-blue transition-colors">
                    {category.id === "therapy"
                      ? "Therapy"
                      : category.id === "fitness"
                        ? "Fitness"
                        : category.id === "beauty"
                          ? "Beauty"
                          : category.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {category.description}
                  </p>
                  {selectedCategory === category.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-3 h-3 bg-roam-blue rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Search and Filter Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Find Your Perfect Service
              </h3>
              <p className="text-gray-600">
                Search and filter to discover exactly what you need
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Enhanced Search Input */}
              <div className="md:col-span-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/20 to-roam-light-blue/20 rounded-2xl blur-sm group-focus-within:blur-0 transition-all duration-300"></div>
                  <div className="relative bg-white rounded-2xl border border-gray-200 group-focus-within:border-roam-blue/50 transition-all duration-300">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-roam-blue transition-colors" />
                    <Input
                      type="search"
                      placeholder="Search for services, treatments, or providers..."
                      className="pl-12 pr-4 h-14 border-0 rounded-2xl text-lg placeholder:text-gray-400 focus:ring-0 focus:border-0 bg-transparent"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced Delivery Type Filter */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-roam-yellow/20 to-roam-light-blue/20 rounded-2xl blur-sm group-focus-within:blur-0 transition-all duration-300"></div>
                <div className="relative">
                  <Select value={selectedDelivery} onValueChange={onDeliveryChange}>
                    <SelectTrigger className="h-14 border-0 rounded-2xl bg-white border border-gray-200 group-focus-within:border-roam-blue/50 transition-all text-lg">
                      <SelectValue placeholder="Delivery Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-0 shadow-2xl">
                      <SelectItem value="all" className="rounded-xl m-1">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                            <Filter className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">All Types</div>
                            <div className="text-xs text-gray-500">
                              Any delivery method
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="mobile" className="rounded-xl m-1">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                            <Car className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">Mobile</div>
                            <div className="text-xs text-gray-500">
                              Provider comes to you
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="business" className="rounded-xl m-1">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Building className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">Business</div>
                            <div className="text-xs text-gray-500">
                              Visit business location
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="virtual" className="rounded-xl m-1">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Video className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">Virtual</div>
                            <div className="text-xs text-gray-500">
                              Online consultation
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Active Filters Display */}
            {(selectedCategory !== "all" ||
              selectedDelivery !== "all" ||
              searchQuery) && (
              <div className="mt-8 p-6 bg-gradient-to-r from-roam-blue/5 to-roam-light-blue/5 rounded-2xl border border-roam-blue/10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-roam-blue" />
                    Active filters:
                  </span>
                  {selectedCategory !== "all" && (
                    <Badge
                      variant="secondary"
                      className="bg-roam-blue text-white cursor-pointer hover:bg-roam-blue/90 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                      onClick={() => onCategorySelect("all")}
                    >
                      {serviceCategories.find(
                        (cat) => cat.id === selectedCategory,
                      )?.name || selectedCategory}
                      <X className="w-4 h-4 ml-2" />
                    </Badge>
                  )}
                  {selectedDelivery !== "all" && (
                    <Badge
                      variant="secondary"
                      className="bg-roam-light-blue text-white cursor-pointer hover:bg-roam-light-blue/90 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                      onClick={() => onDeliveryChange("all")}
                    >
                      {selectedDelivery === "mobile"
                        ? "Mobile"
                        : selectedDelivery === "business"
                          ? "Business"
                          : selectedDelivery === "virtual"
                            ? "Virtual"
                            : selectedDelivery}
                      <X className="w-4 h-4 ml-2" />
                    </Badge>
                  )}
                  {searchQuery && (
                    <Badge
                      variant="secondary"
                      className="bg-roam-yellow text-gray-900 cursor-pointer hover:bg-roam-yellow/90 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                      onClick={() => onSearchChange("")}
                    >
                      "{searchQuery}"
                      <X className="w-4 h-4 ml-2" />
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-roam-blue hover:bg-white/50 px-4 py-2 rounded-full font-medium transition-all"
                    onClick={onResetFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};