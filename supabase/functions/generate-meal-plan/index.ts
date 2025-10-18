import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Required environment variables are not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build dietary restrictions string
    const dietaryInfo = [];
    if (preferences.dietary_restrictions?.length > 0) {
      dietaryInfo.push(`Dietary restrictions: ${preferences.dietary_restrictions.join(", ")}`);
    }
    if (preferences.allergies?.length > 0) {
      dietaryInfo.push(`Allergies: ${preferences.allergies.join(", ")}`);
    }
    if (preferences.cuisine_preferences?.length > 0) {
      dietaryInfo.push(`Cuisine preferences: ${preferences.cuisine_preferences.join(", ")}`);
    }

    const days = preferences.plan_duration === "2_weeks" ? 14 : 7;
    const breakfastOptions = preferences.breakfast_options || 3;
    const lunchOptions = preferences.lunch_options || 3;
    const dinnerOptions = preferences.dinner_options || 3;

    const systemPrompt = `You are a professional nutritionist and chef. Generate meal plans that strictly follow dietary restrictions and preferences. Return ONLY valid JSON, no markdown formatting or code blocks.`;

    const userPrompt = `Create a ${days}-day meal plan with the following requirements:
${dietaryInfo.join("\n")}
Cooking time preference: ${preferences.cooking_time || "30 minutes"}
Health goals: ${preferences.health_goals?.join(", ") || "general health"}

For each day, provide:
- ${breakfastOptions} breakfast options
- ${lunchOptions} lunch options  
- ${dinnerOptions} dinner options

CRITICAL: All recipes MUST strictly follow these dietary restrictions: ${preferences.dietary_restrictions?.join(", ") || "none"}. For example, if paleo is specified, NO grains, dairy, legumes, or processed foods are allowed.

For each recipe, provide:
- name: recipe name
- description: brief description
- ingredients: array of {item: string, amount: string, unit: string}
- instructions: array of step strings
- prep_time: minutes
- cook_time: minutes
- servings: number
- cuisine_type: cuisine style
- dietary_tags: array of applicable diet tags
- meal_type: "breakfast", "lunch", or "dinner"

Return ONLY this JSON structure with no markdown:
{
  "days": [
    {
      "day": 1,
      "breakfast": [recipe objects],
      "lunch": [recipe objects],
      "dinner": [recipe objects]
    }
  ]
}`;

    console.log("Calling AI gateway...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Remove markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const mealPlanData = JSON.parse(cleanedContent);

    console.log("Saving recipes to database...");
    
    // Store all recipes and build the plan structure
    const planWithRecipeIds: any = { days: [] };
    
    for (const day of mealPlanData.days) {
      const dayData: any = { day: day.day, breakfast: [], lunch: [], dinner: [] };
      
      for (const mealType of ['breakfast', 'lunch', 'dinner']) {
        const meals = day[mealType] || [];
        
        for (const recipe of meals) {
          // Insert recipe
          const { data: insertedRecipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              name: recipe.name,
              description: recipe.description,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              prep_time: recipe.prep_time,
              cook_time: recipe.cook_time,
              servings: recipe.servings,
              cuisine_type: recipe.cuisine_type,
              dietary_tags: recipe.dietary_tags,
              meal_type: mealType,
            })
            .select()
            .single();

          if (recipeError) {
            console.error("Error inserting recipe:", recipeError);
            throw recipeError;
          }

          dayData[mealType].push(insertedRecipe.id);
        }
      }
      
      planWithRecipeIds.days.push(dayData);
    }

    console.log("Meal plan generated successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: planWithRecipeIds 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-meal-plan function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});