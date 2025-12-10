# AI + Supabase Integration - Quick Start Guide ⚡

**Time to implement:** 2-4 hours  
**Difficulty:** Intermediate

---

## 🎯 What This Does

Your AI will be able to query your Supabase database in real-time to provide:
- ✅ Accurate service listings with current prices
- ✅ Real provider information with ratings
- ✅ Location-specific availability
- ✅ Dynamic recommendations

---

## 🚀 Quick Implementation (4 Steps)

### Step 1: Create Tool Definitions (30 mins)

Create: `roam-customer-app/api/supabase-tools.ts`

```typescript
import { supabase } from '@/lib/supabase';

export const supabaseTools = [
  {
    name: 'search_services',
    description: 'Search for services by category, price, location',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['massage', 'beauty', 'fitness', 'iv-therapy', 'medical', 'lifestyle']
        },
        location: { type: 'string' },
        max_price: { type: 'number' }
      },
      required: []
    }
  }
];

export const toolExecutors = {
  async search_services(params: any) {
    let query = supabase
      .from('services')
      .select(`
        *,
        providers (full_name, average_rating, specialty),
        businesses (name, city)
      `)
      .eq('is_active', true);

    if (params.category) query = query.eq('category', params.category);
    if (params.max_price) query = query.lte('base_price', params.max_price);
    
    const { data, error } = await query.limit(10);
    
    if (error) return { error: error.message };
    
    return { count: data?.length || 0, services: data };
  }
};
```

### Step 2: Update Chat API (45 mins)

Modify: `roam-customer-app/api/chat.ts`

```typescript
import { supabaseTools, toolExecutors } from './supabase-tools';

// In your handler function, add tools to Claude API call:

const response = await anthropic.messages.create({
  model: "claude-3-haiku-20240307",
  max_tokens: 2048,
  system: systemPrompt,
  messages: conversation,
  tools: supabaseTools,  // ← Add this
});

// Handle tool use loop:
while (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) break;

  // Execute tool
  const result = await toolExecutors[toolUse.name](toolUse.input);

  // Add to conversation
  conversation.push({
    role: 'assistant',
    content: response.content,
  });
  
  conversation.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify(result),
    }],
  });

  // Get next response
  response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    system: systemPrompt,
    messages: conversation,
    tools: supabaseTools,
  });
}

// Continue with normal response handling...
```

### Step 3: Update System Prompt (15 mins)

Add to your system prompt in `chat.ts`:

```typescript
const systemPrompt = `...existing prompt...

=== REAL-TIME DATA TOOLS ===

You have access to tools that query our live database:

**search_services** - Find services by category, location, price
Use when: User asks about services, pricing, or availability

Example:
User: "Show me massage services"
You: [Call search_services with category: 'massage']
Then respond with actual results from database

User: "Massage in Seaside under $100"
You: [Call search_services with category: 'massage', location: 'Seaside', max_price: 100]

ALWAYS use tools when you need current service/provider data!
`;
```

### Step 4: Test It! (30 mins)

```bash
# Start your dev server
npm run dev

# Test queries:
# 1. "Show me massage services"
# 2. "What services do you offer in Seaside?"
# 3. "How much does massage cost?"

# Check logs for tool calls:
# You should see: "Tool called: search_services {category: 'massage'}"
```

---

## 🧪 Testing Checklist

Test these queries to verify it works:

- [ ] "Show me all massage services"  
  → Should call `search_services` and return real data

- [ ] "Massage therapists in [your-city]"  
  → Should query with location filter

- [ ] "How much does massage cost?"  
  → Should return real price ranges from database

- [ ] "What IV therapy options do you have?"  
  → Should find IV therapy services

- [ ] "Show me fitness trainers"  
  → Should search for fitness category

---

## 🐛 Troubleshooting

**"Tool not being called"**
- Check system prompt includes tool instructions
- Verify tool definitions are passed to API
- Check Claude model supports tools (3+)

**"Database error"**
- Verify Supabase client is configured
- Check table names match your schema
- Test query directly in Supabase dashboard

**"Response format error"**
- Check tool executor returns proper JSON
- Verify error handling in executors
- Look for TypeScript type mismatches

---

## 📊 Verify It's Working

You'll know it's working when:

1. **In logs:** See "Tool called: search_services"
2. **In response:** AI mentions specific providers/prices from YOUR database
3. **Test query:** "Show me services" returns YOUR actual services, not generic info

Example good response:
```
"I found 12 massage therapists in your area:

• Sarah Thompson (5.0★) - $120/hr
• Mike Chen (4.9★) - $100/hr
..."
```

Example bad response (means tools NOT working):
```
"We offer various massage services..."  ← Generic, not real data
```

---

## 🚀 Next Steps

Once basic integration works:

1. **Add more tools:**
   - `search_providers` 
   - `get_price_range`
   - `check_availability`

2. **Add caching:**
   - Cache price ranges for 1 hour
   - Cache provider lists for 15 mins

3. **Add analytics:**
   - Track which tools are used most
   - Measure query performance
   - Monitor errors

4. **Optimize queries:**
   - Add database indexes
   - Limit result counts
   - Use database views for complex queries

---

## 📚 Full Documentation

For complete details, see:
- [AI_AGENT_SUPABASE_MCP_INTEGRATION.md](./AI_AGENT_SUPABASE_MCP_INTEGRATION.md) - Full implementation guide
- [ROAM_AI_AGENT_COMPLETE_OVERVIEW.md](./ROAM_AI_AGENT_COMPLETE_OVERVIEW.md) - AI agent overview

---

## ✅ Success Criteria

Your integration is successful when:

✅ AI queries database for real-time data  
✅ Responses include actual provider names and prices  
✅ Location filters work correctly  
✅ Price queries return accurate ranges  
✅ No errors in production logs  
✅ Users get more accurate, helpful responses  

---

**Ready to give your AI real superpowers? Start with Step 1!** 🚀
