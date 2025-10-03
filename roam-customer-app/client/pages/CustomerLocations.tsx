import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Edit, Trash2, Home, Building, MapPinned } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CustomerLocation {
  id: string;
  location_name: string;
  street_address: string;
  unit_number: string | null;
  city: string;
  state: string;
  zip_code: string;
  is_primary: boolean;
  is_active: boolean;
  location_type: 'home' | 'work' | 'other';
  access_instructions: string | null;
}

export default function CustomerLocations() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CustomerLocation | null>(null);
  const [formData, setFormData] = useState({
    location_name: '',
    street_address: '',
    unit_number: '',
    city: '',
    state: '',
    zip_code: '',
    is_primary: false,
    location_type: 'home' as 'home' | 'work' | 'other',
    access_instructions: '',
  });

  useEffect(() => {
    if (customer) {
      loadLocations();
    }
  }, [customer]);

  const loadLocations = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_locations')
        .select('*')
        .eq('customer_id', customer.user_id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!customer) return;

    // Validation
    if (!formData.street_address || !formData.city || !formData.state || !formData.zip_code) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_locations')
        .insert({
          customer_id: customer.user_id,
          ...formData,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location added successfully',
      });

      setIsAddDialogOpen(false);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: 'Failed to add location',
        variant: 'destructive',
      });
    }
  };

  const handleEditLocation = async () => {
    if (!editingLocation) return;

    // Validation
    if (!formData.street_address || !formData.city || !formData.state || !formData.zip_code) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_locations')
        .update(formData)
        .eq('id', editingLocation.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });

      setIsEditDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update location',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('customer_locations')
        .update({ is_active: false })
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    }
  };

  const handleSetPrimary = async (locationId: string) => {
    if (!customer) return;

    try {
      // First, remove primary status from all locations
      await supabase
        .from('customer_locations')
        .update({ is_primary: false })
        .eq('customer_id', customer.user_id);

      // Then set this location as primary
      const { error } = await supabase
        .from('customer_locations')
        .update({ is_primary: true })
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Primary location updated',
      });

      loadLocations();
    } catch (error) {
      console.error('Error setting primary location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update primary location',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (location: CustomerLocation) => {
    setEditingLocation(location);
    setFormData({
      location_name: location.location_name,
      street_address: location.street_address,
      unit_number: location.unit_number || '',
      city: location.city,
      state: location.state,
      zip_code: location.zip_code,
      is_primary: location.is_primary,
      location_type: location.location_type,
      access_instructions: location.access_instructions || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      location_name: '',
      street_address: '',
      unit_number: '',
      city: '',
      state: '',
      zip_code: '',
      is_primary: false,
      location_type: 'home',
      access_instructions: '',
    });
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="w-5 h-5 text-roam-blue" />;
      case 'work':
        return <Building className="w-5 h-5 text-roam-blue" />;
      default:
        return <MapPinned className="w-5 h-5 text-roam-blue" />;
    }
  };

  const LocationForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="location_name">Location Name</Label>
        <Input
          id="location_name"
          placeholder="e.g., Home, Office, Mom's House"
          value={formData.location_name}
          onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="location_type">Location Type</Label>
        <Select
          value={formData.location_type}
          onValueChange={(value: 'home' | 'work' | 'other') => setFormData({ ...formData, location_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home">Home</SelectItem>
            <SelectItem value="work">Work</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="street_address">Street Address *</Label>
        <Input
          id="street_address"
          placeholder="123 Main Street"
          value={formData.street_address}
          onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="unit_number">Unit/Apt Number</Label>
        <Input
          id="unit_number"
          placeholder="Apt 2B"
          value={formData.unit_number}
          onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            placeholder="Miami"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            placeholder="FL"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
            maxLength={2}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="zip_code">ZIP Code *</Label>
        <Input
          id="zip_code"
          placeholder="33101"
          value={formData.zip_code}
          onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="access_instructions">Access Instructions</Label>
        <Input
          id="access_instructions"
          placeholder="Gate code, parking instructions, etc."
          value={formData.access_instructions}
          onChange={(e) => setFormData({ ...formData, access_instructions: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_primary"
          checked={formData.is_primary}
          onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
          className="rounded border-gray-300"
        />
        <Label htmlFor="is_primary" className="cursor-pointer">
          Set as primary location
        </Label>
      </div>

      <DialogFooter>
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </DialogFooter>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Locations</h1>
            <p className="text-muted-foreground">
              Manage your saved addresses for faster booking
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
              </DialogHeader>
              <LocationForm onSubmit={handleAddLocation} submitLabel="Add Location" />
            </DialogContent>
          </Dialog>
        </div>

        {/* Locations List */}
        {locations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No locations yet</h3>
              <p className="text-muted-foreground mb-6 text-center">
                Add your first location to make booking services easier
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <Card key={location.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {getLocationIcon(location.location_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg capitalize">
                            {location.location_name || location.location_type}
                          </h3>
                          {location.is_primary && (
                            <Badge variant="default" className="bg-roam-blue">
                              Primary
                            </Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {location.location_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            {location.street_address}
                            {location.unit_number && `, ${location.unit_number}`}
                          </p>
                          <p>
                            {location.city}, {location.state} {location.zip_code}
                          </p>
                          {location.access_instructions && (
                            <p className="text-xs italic mt-2">
                              Access: {location.access_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!location.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(location.id)}
                        >
                          Set as Primary
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLocation(location.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
            </DialogHeader>
            <LocationForm onSubmit={handleEditLocation} submitLabel="Save Changes" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
