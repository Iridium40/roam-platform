# Provider Service Assignment - Quick Start Guide

## 📋 Overview

This guide shows business owners and dispatchers how to assign services to their provider staff members.

---

## 🎯 What This Feature Does

When you assign services to a provider:

1. **Provider sees only assigned services** in their service list
2. **Provider can accept bookings** only for assigned services
3. **Add-ons are automatically assigned** based on service compatibility
4. **Business price is used** as the provider's offering price

---

## 👥 Who Can Use This Feature?

✅ **Business Owners** (role: `owner`)  
✅ **Dispatchers** (role: `dispatcher`)  
❌ **Providers** cannot assign services to themselves or others

---

## 📝 Step-by-Step Instructions

### Step 1: Activate Services in Business Settings

Before you can assign services to providers, you need to activate them:

1. Go to **Dashboard** → **Business Settings**
2. Click the **Services** tab
3. Find services you want to offer
4. Set **Business Price** (this is what providers will charge)
5. Toggle **Active** switch to ON (green)
6. Click **Save Changes**

**Important:** Only active services can be assigned to providers!

---

### Step 2: Navigate to Staff Management

1. Go to **Dashboard** → **Staff** tab
2. You'll see a list of all staff members

---

### Step 3: Edit a Provider

1. Find a staff member with role = **Provider** (not owner/dispatcher)
2. Click the **Edit** button (pencil icon)
3. The edit dialog opens with two tabs:
   - **Details** (basic info)
   - **Services** (service assignment) ← We'll use this one

---

### Step 4: Assign Services

1. Click the **Services** tab
2. You'll see all active business services listed
3. Each service shows:
   - ✓ Checkbox for selection
   - Service name
   - Description
   - Price (business price)
   - Duration
   - Delivery type
4. Check the boxes next to services you want to assign
5. The badge at top shows how many services are selected
6. Click **Update Staff Member**

---

### Step 5: Verify Assignment

After saving:
- You'll see a success message
- Compatible add-ons are automatically assigned
- The provider can now see these services in their app

---

## 💡 Example Scenario

### Scenario: Assigning Cleaning Services

**Business:** Clean & Shine Services  
**Provider:** John Doe  
**Active Services:**
- House Cleaning ($75, 120 min)
- Deep Cleaning ($150, 180 min)
- Move-out Cleaning ($200, 240 min)
- Carpet Cleaning ($50, 60 min)

**Assignment:**
1. Owner opens John's profile
2. Goes to Services tab
3. Selects:
   - ✅ House Cleaning
   - ✅ Deep Cleaning
   - ❌ Move-out Cleaning (John not trained)
   - ✅ Carpet Cleaning
4. Clicks Update

**Result:**
- John can now accept bookings for 3 services
- Auto-assigned add-ons might include:
  - Pet Hair Removal (if eligible for house/deep cleaning)
  - Stain Protection (if eligible for carpet cleaning)
  - Window Cleaning (if eligible for house cleaning)

---

## 🔄 Auto-Assigned Add-ons

### How It Works

When you assign services, the system automatically:

1. Looks up compatible add-ons for each service
2. Checks which add-ons your business offers
3. Assigns matching add-ons to the provider

### Example

**Service:** House Cleaning  
**Compatible Add-ons (from database):**
- Pet Hair Removal
- Window Cleaning  
- Refrigerator Cleaning

**Your Business Add-ons:**
- Pet Hair Removal ✅
- Window Cleaning ✅
- Refrigerator Cleaning ❌ (not offered)

**Result:** Provider gets Pet Hair Removal and Window Cleaning

---

## 🎨 UI Guide

### Service Card Layout

```
┌─────────────────────────────────────────────────────┐
│ [✓] House Cleaning                                  │
│     Professional cleaning including dusting,        │
│     vacuuming, mopping, and bathroom cleaning.      │
│     [$75.00] [120 min] [customer location]          │
└─────────────────────────────────────────────────────┘
```

### Selection Badge

Shows at top right of Services tab:
```
┌──────────────┐
│   3 selected │
└──────────────┘
```

### Empty State

If no active services exist:
```
⚠️ No active services available.
   Please add and activate services in the 
   Business Services tab first.
```

### Auto-assign Notice

Information box at bottom:
```
📦 Add-ons will be auto-assigned:
   When you assign services, compatible add-ons 
   from your business will automatically be assigned 
   to this provider.
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: No Services Showing
**Problem:** Services tab is empty  
**Solution:** 
1. Go to Business Settings → Services
2. Activate at least one service
3. Return to staff edit and refresh

### Issue 2: Services Tab Not Showing
**Problem:** Don't see Services tab in edit dialog  
**Solution:** This staff member might be an Owner or Dispatcher. Services can only be assigned to Providers. Change their role to Provider first.

### Issue 3: Can't Find Edit Button
**Problem:** No edit button on staff card  
**Solution:** You might not have permission. Only Owners and Dispatchers can edit staff.

### Issue 4: Changes Not Saving
**Problem:** Click save but nothing happens  
**Solution:** 
1. Check your internet connection
2. Try refreshing the page
3. Check browser console for errors

---

## 🔐 Permissions Matrix

| Action | Owner | Dispatcher | Provider |
|--------|-------|------------|----------|
| View staff list | ✅ | ✅ | ❌ |
| Edit provider details | ✅ | ✅ | ❌ |
| Assign services | ✅ | ✅ | ❌ |
| View own services | ✅ | ✅ | ✅ |

---

## 📊 Data Flow

### When You Assign Services

```
1. Select services in UI
   ↓
2. Click "Update Staff Member"
   ↓
3. System updates provider details
   ↓
4. System saves selected services
   ↓
5. System finds compatible add-ons
   ↓
6. System assigns add-ons to provider
   ↓
7. Success notification shown
   ↓
8. Provider sees new services in their app
```

---

## 🚀 Best Practices

### 1. **Start Small**
- Assign 1-2 services to new providers
- Add more as they gain experience

### 2. **Match Skills to Services**
- Consider provider's training and experience
- Don't assign services they're not trained for

### 3. **Review Regularly**
- Periodically review service assignments
- Add services as providers gain skills
- Remove services if performance issues

### 4. **Use Service Tiers**
- **New Providers:** Basic services only
- **Experienced Providers:** Advanced services
- **Senior Providers:** All services

### 5. **Monitor Performance**
- Track bookings per service
- Check customer ratings
- Adjust assignments based on data

---

## 🧪 Testing Your Setup

### Quick Test Checklist

1. ✅ Create a test provider account
2. ✅ Activate 2-3 services in Business Settings
3. ✅ Assign services to test provider
4. ✅ Verify services appear in provider's view
5. ✅ Check that add-ons were auto-assigned
6. ✅ Test booking creation with assigned service
7. ✅ Unassign a service and verify it disappears

---

## 🔮 Advanced Tips

### Bulk Assignment Strategy

For multiple providers with same skills:
1. Document standard service packages
2. Use same selections for each provider
3. Update all when adding new services

### Specialty Services

Create specialized provider roles:
- **Residential Specialist:** Home cleaning services
- **Commercial Specialist:** Office cleaning services
- **Deep Clean Expert:** Advanced cleaning services

### Seasonal Services

Adjust assignments seasonally:
- **Spring:** Add yard services
- **Winter:** Remove outdoor services
- **Holidays:** Add special event services

---

## 📞 Support

### Need Help?

- **Documentation:** Check `PROVIDER_SERVICE_ASSIGNMENT.md` for technical details
- **Database Schema:** See `DATABASE_SCHEMA_REFERENCE.md`
- **Permissions:** See `ROLE_BASED_PERMISSIONS.md`

### Reporting Issues

If you encounter bugs:
1. Note the exact steps you took
2. Check browser console for errors
3. Take screenshots if helpful
4. Report to development team

---

## ✅ Summary

**Key Points to Remember:**

1. ✨ Only **active business services** can be assigned
2. 🎯 Only **providers** can be assigned services
3. 🔐 Only **owners and dispatchers** can assign services
4. 💰 **Business price** becomes provider's price
5. 🎁 **Add-ons are automatic** based on service compatibility
6. 📊 Changes are **immediate** after saving
7. ♻️ You can **modify assignments** anytime

---

**Ready to start assigning services? Follow the steps above and your providers will be set up in minutes!** 🚀
