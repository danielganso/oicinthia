import { supabase } from '../lib/supabase';

/**
 * Create a new professional in the database
 * @param {Object} professionalData - The professional data
 * @param {string} professionalData.name - Professional name
 * @param {string} professionalData.specialty - Professional specialty
 * @param {string} professionalData.cro - Professional CRO number
 * @param {string} professionalData.phone - Professional phone number
 * @param {string} professionalData.email - Professional email
 * @param {string} professionalData.bio - Professional biography
 * @param {string} professionalData.status - Professional status (active/inactive)
 * @param {Array} professionalData.locations_json - Professional service locations
 * @returns {Promise} - The created professional data
 */
export async function createProfessional(professionalData) {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .insert([professionalData])
      .select();

    if (error) {
      throw new Error(error.message || 'Erro ao cadastrar profissional');
    }

    return data[0];
  } catch (error) {
    console.error('Error in createProfessional:', error);
    throw error;
  }
}

/**
 * Update an existing professional in the database
 * @param {string} id - The professional ID
 * @param {Object} professionalData - The professional data to update
 * @param {string} professionalData.name - Professional name
 * @param {string} professionalData.specialty - Professional specialty
 * @param {string} professionalData.whatsapp_device_id - WhatsApp device ID
 * @param {string} professionalData.status - Professional status (active/inactive)
 * @param {Array} professionalData.locations_json - Professional service locations
 * @returns {Promise} - The updated professional data
 */
export async function updateProfessional(id, professionalData) {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .update(professionalData)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar profissional');
    }

    return data[0];
  } catch (error) {
    console.error('Error in updateProfessional:', error);
    throw error;
  }
}

/**
 * Get all professionals from the database
 * @returns {Promise} - The professionals data
 */
export async function getProfessionals() {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(error.message || 'Erro ao buscar profissionais');
    }

    return data;
  } catch (error) {
    console.error('Error in getProfessionals:', error);
    throw error;
  }
}

/**
 * Get a professional by ID
 * @param {string} id - The professional ID
 * @returns {Promise} - The professional data
 */
export async function getProfessionalById(id) {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao buscar profissional');
    }

    return data;
  } catch (error) {
    console.error('Error in getProfessionalById:', error);
    throw error;
  }
}

/**
 * Delete a professional from the database
 * @param {string} id - The professional ID
 * @returns {Promise} - The deletion result
 */
export async function deleteProfessional(id) {
  try {
    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Erro ao excluir profissional');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteProfessional:', error);
    throw error;
  }
}