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
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));
    
    const { preferences } = body;
    
    if (!preferences) {
      throw new Error("No preferences provided in request body");
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Required environment variables are not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Support both camelCase (from frontend) and snake_case (from database)
    const dietaryRestrictions = preferences.dietaryRestrictions || preferences.dietary_restrictions || [];
    const allergies = preferences.allergies || [];
    const cuisinePreferences = preferences.cuisinePreferences || preferences.cuisine_preferences || [];
    const cookingTime = preferences.cookingTime || preferences.cooking_time || "30-min";
    const healthGoals = preferences.healthGoals || preferences.health_goals || [];
    const planDuration = preferences.planDuration || preferences.plan_duration || "1_week";
    const breakfastOptions = preferences.breakfastOptions || preferences.breakfast_options || 3;
    const lunchOptions = preferences.lunchOptions || preferences.lunch_options || 3;
    const dinnerOptions = preferences.dinnerOptions || preferences.dinner_options || 3;

    // Build dietary restrictions string
    const dietaryInfo = [];
    if (dietaryRestrictions.length > 0) {
      dietaryInfo.push(`Dietary restrictions: ${dietaryRestrictions.join(", ")}`);
    }
    if (allergies.length > 0) {
      dietaryInfo.push(`Allergies: ${allergies.join(", ")}`);
    }
    if (cuisinePreferences.length > 0) {
      dietaryInfo.push(`Cuisine preferences: ${cuisinePreferences.join(", ")}`);
    }

    const days = planDuration === "2_weeks" ? 14 : 7;

    const systemPrompt = `You are a professional nutritionist and chef. Generate meal plans that strictly follow dietary restrictions and preferences.`;

    const userPrompt = `Create a ${days}-day meal plan with the following requirements:
${dietaryInfo.join("\n")}
Cooking time preference: ${cookingTime}
Health goals: ${healthGoals.join(", ") || "general health"}

For each day, provide:
- ${breakfastOptions} breakfast options
- ${lunchOptions} lunch options  
- ${dinnerOptions} dinner options

CRITICAL: All recipes MUST strictly follow these dietary restrictions: ${dietaryRestrictions.join(", ") || "none"}. For example, if paleo is specified, NO grains, dairy, legumes, or processed foods are allowed.`;

    console.log("Calling AI gateway with structured output...");
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
        tools: [
          {
            type: "function",
            function: {
              name: "create_meal_plan",
              description: "Create a structured meal plan with recipes",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number" },
                        breakfast: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              ingredients: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    item: { type: "string" },
                                    amount: { type: "string" },
                                    unit: { type: "string" }
                                  },
                                  required: ["item", "amount", "unit"]
                                }
                              },
                              instructions: {
                                type: "array",
                                items: { type: "string" }
                              },
                              prep_time: { type: "number" },
                              cook_time: { type: "number" },
                              servings: { type: "number" },
                              cuisine_type: { type: "string" },
                              dietary_tags: {
                                type: "array",
                                items: { type: "string" }
                              }
                            },
                            required: ["name", "description", "ingredients", "instructions", "prep_time", "cook_time", "servings"]
                          }
                        },
                        lunch: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              ingredients: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    item: { type: "string" },
                                    amount: { type: "string" },
                                    unit: { type: "string" }
                                  },
                                  required: ["item", "amount", "unit"]
                                }
                              },
                              instructions: {
                                type: "array",
                                items: { type: "string" }
                              },
                              prep_time: { type: "number" },
                              cook_time: { type: "number" },
                              servings: { type: "number" },
                              cuisine_type: { type: "string" },
                              dietary_tags: {
                                type: "array",
                                items: { type: "string" }
                              }
                            },
                            required: ["name", "description", "ingredients", "instructions", "prep_time", "cook_time", "servings"]
                          }
                        },
                        dinner: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              ingredients: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    item: { type: "string" },
                                    amount: { type: "string" },
                                    unit: { type: "string" }
                                  },
                                  required: ["item", "amount", "unit"]
                                }
                              },
                              instructions: {
                                type: "array",
                                items: { type: "string" }
                              },
                              prep_time: { type: "number" },
                              cook_time: { type: "number" },
                              servings: { type: "number" },
                              cuisine_type: { type: "string" },
                              dietary_tags: {
                                type: "array",
                                items: { type: "string" }
                              }
                            },
                            required: ["name", "description", "ingredients", "instructions", "prep_time", "cook_time", "servings"]
                          }
                        }
                      },
                      required: ["day", "breakfast", "lunch", "dinner"]
                    }
                  }
                },
                required: ["days"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_meal_plan" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");
    
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }
    
    const mealPlanData = JSON.parse(toolCall.function.arguments);

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