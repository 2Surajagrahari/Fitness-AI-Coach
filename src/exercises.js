// Gemini Exercise Generator
async function generateExercisesWithAI() {
    const prompt = document.getElementById('ai-prompt').value.trim();
    if (!prompt) {
      alert('Please describe what exercises you want to generate');
      return;
    }
  
    aiSpinner.classList.remove('hidden');
    generateBtn.disabled = true;
    aiResults.classList.add('hidden');
    
    try {
      // Call your backend endpoint that uses Gemini
      const response = await fetch('http://localhost:5000/generate-exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          user_id: localStorage.getItem('user_id')
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to generate exercises');
      }
  
      const data = await response.json();
      
      // Format the Gemini response into exercise cards
      aiExercisesList.innerHTML = data.exercises.map(ex => `
        <div class="bg-white p-3 rounded-lg border border-gray-200">
          <h5 class="font-bold mb-1">${ex.name}</h5>
          <p class="text-sm text-gray-600 mb-2">${ex.description}</p>
          <div class="prose prose-sm max-w-none">
            ${ex.instructions.replace(/\n/g, '<br>')}
          </div>
          ${ex.video_url ? `
            <div class="mt-2">
              <a href="${ex.video_url}" target="_blank" class="text-primary-600 hover:underline text-sm flex items-center gap-1">
                <i class="fas fa-video"></i>
                Watch demonstration
              </a>
            </div>
          ` : ''}
        </div>
      `).join('');
  
    } catch (error) {
      console.error('Error generating exercises:', error);
      aiExercisesList.innerHTML = `
        <div class="bg-red-50 text-red-700 p-3 rounded-lg">
          <i class="fas fa-exclamation-circle mr-1"></i>
          Error generating exercises. Please try again.
        </div>
      `;
    } finally {
      aiSpinner.classList.add('hidden');
      generateBtn.disabled = false;
      aiResults.classList.remove('hidden');
    }
  }