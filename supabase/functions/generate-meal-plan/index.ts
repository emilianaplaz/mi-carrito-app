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

INSTRUCCIONES IMPORTANTES SOBRE OPCIONES:
- Crea un TOTAL de ${breakfastOptions} recetas DIFERENTES de desayuno para TODA la semana (no por día)
- Crea un TOTAL de ${lunchOptions} recetas DIFERENTES de almuerzo para TODA la semana (no por día)
- Crea un TOTAL de ${dinnerOptions} recetas DIFERENTES de cena para TODA la semana (no por día)
- Distribuye y repite estas recetas a lo largo de los ${days} días
- Máximo 1 receta nueva por día

FORMATO DE INGREDIENTES (CRÍTICO - SEGUIR ESTRICTAMENTE):
- NUNCA NUNCA incluyas estos items: agua, sal, pimienta, aceite de oliva
- Usa nombres de ingredientes BASE sin preparación (ejemplo: "ajo" NO "ajo picado")
- Usa nombres CONSISTENTES:
  * "berries" (NO frutas del bosque, frutos rojos, bayas)
  * "tomate" (NO jitomate)
  * "patatas" (NO papas, papa)
  * "pimiento" (NO ají, chile, pimentón)
  * "huevos" (siempre plural, NO huevo)
  * "dientes de ajo" (NO dientes, NO ajo)

- CANTIDADES ESPECÍFICAS OBLIGATORIAS (números grandes para toda la semana):
  * Huevos: Mínimo "12" con unidad "huevos" (NO menos de 6)
  * Ajo: Mínimo "8" con unidad "dientes" (NO menos de 5)
  * Carnes: Mínimo "500" con unidad "g" o "1" con unidad "kg"
  * Vegetales contables: "4" con unidad "tomates", "3" con unidad "cebollas"
  * Vegetales peso: "300" con unidad "g" mínimo
  * Líquidos: "250" con unidad "ml" mínimo
  * Quesos: "200" con unidad "g" mínimo
  * Frutos secos: "100" con unidad "g" mínimo

- FORMATO JSON EXACTO:
  * Campo "item": nombre del ingrediente base
  * Campo "amount": SIEMPRE número (entero o decimal: 1, 2, 12, 0.5, 1.5)
  * Campo "unit": unidad específica (huevos, dientes, g, kg, ml, l, cucharadas, cucharaditas)

- NO uses: "al gusto", "suficiente", "a gusto", sin número

IMPORTANTE: 
- TODOS los nombres de recetas, descripciones e instrucciones deben estar en ESPAÑOL
- Las recetas DEBEN seguir estrictamente las restricciones dietéticas: ${dietaryRestrictions.join(", ") || "ninguna"}
- Las instrucciones deben ser claras y paso a paso, incluyendo cómo preparar los ingredientes

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
            {"item": "cebolla", "amount": "1", "unit": "unidad"},
            {"item": "tomate", "amount": "200", "unit": "g"}
          ],
          "instructions": ["Paso 1: Picar la cebolla finamente", "Paso 2 en español"],
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