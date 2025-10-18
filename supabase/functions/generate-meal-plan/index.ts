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

    const days = planDuration === "2_weeks" ? 14 : 7;

    // Build detailed prompt in Spanish
    const dietaryInfo = [];
    if (dietaryRestrictions.length > 0 && !dietaryRestrictions.includes("ninguna")) {
      dietaryInfo.push(`Restricciones dietéticas: ${dietaryRestrictions.join(", ")}`);
    }
    if (allergies.length > 0 && !allergies.includes("ninguna")) {
      dietaryInfo.push(`Alergias: ${allergies.join(", ")}`);
    }
    if (cuisinePreferences.length > 0 && !cuisinePreferences.includes("todas")) {
      dietaryInfo.push(`Preferencias de cocina: ${cuisinePreferences.join(", ")}`);
    }

    const prompt = `Eres un nutricionista profesional y chef experto. Crea un plan de comidas detallado de ${days} días en ESPAÑOL.

REQUISITOS:
${dietaryInfo.join("\n")}
Tiempo de cocción preferido: ${cookingTime}
Objetivos de salud: ${healthGoals.join(", ") || "salud general"}

Para cada día, proporciona:
- ${breakfastOptions} opciones de desayuno
- ${lunchOptions} opciones de almuerzo
- ${dinnerOptions} opciones de cena

IMPORTANTE: 
- TODOS los nombres de recetas, descripciones e instrucciones deben estar en ESPAÑOL
- Las recetas DEBEN seguir estrictamente las restricciones dietéticas: ${dietaryRestrictions.join(", ") || "ninguna"}
- Cada receta debe incluir ingredientes detallados con cantidades
- Las instrucciones deben ser claras y paso a paso

Responde SOLO con un objeto JSON válido en este formato exacto:
{
  "days": [
    {
      "day": 1,
      "breakfast": [
        {
          "name": "Nombre de la receta en español",
          "description": "Descripción breve en español",
          "ingredients": [
            {"item": "ingrediente", "amount": "cantidad", "unit": "unidad"}
          ],
          "instructions": ["Paso 1 en español", "Paso 2 en español"],
          "prep_time": 10,
          "cook_time": 20,
          "servings": 4,
          "cuisine_type": "tipo de cocina",
          "dietary_tags": ["etiquetas"]
        }
      ],
      "lunch": [...],
      "dinner": [...]
    }
  ]
}`;

    console.log("Calling Lovable AI...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");
    
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      throw new Error("Invalid AI response structure");
    }

    const content = aiData.choices[0].message.content;
    
    // Extract JSON from the response (handle markdown code blocks)
    let mealPlanData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        mealPlanData = JSON.parse(jsonMatch[1]);
      } else {
        mealPlanData = JSON.parse(content);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse meal plan data from AI response");
    }

    if (!mealPlanData.days || !Array.isArray(mealPlanData.days)) {
      throw new Error("Invalid meal plan structure from AI");
    }

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