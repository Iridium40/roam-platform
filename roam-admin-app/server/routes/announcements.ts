import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleAnnouncements(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getAnnouncements(req, res);
      case 'POST':
        return await createAnnouncement(req, res);
      case 'PUT':
        return await updateAnnouncement(req, res);
      case 'DELETE':
        return await deleteAnnouncement(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in announcements API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getAnnouncements(req: Request, res: Response) {
  try {
    const { 
      status,
      announcement_audience,
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        announcement_audience,
        announcement_type,
        is_active,
        start_date,
        end_date,
        created_at
      `);

    // Apply filters
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (announcement_audience && announcement_audience !== 'all') {
      query = query.eq('announcement_audience', announcement_audience);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply sorting
    const sortField = sortBy as string;
    const order = sortOrder === 'desc' ? { ascending: false } : { ascending: true };
    query = query.order(sortField, order);

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data: announcements, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching announcements:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    // Add computed fields
    const announcementsWithStatus = (announcements || []).map((announcement: any) => {
      const now = new Date();
      const startDate = announcement.start_date ? new Date(announcement.start_date) : null;
      const endDate = announcement.end_date ? new Date(announcement.end_date) : null;
      
      let status = 'inactive';
      if (announcement.is_active) {
        if (!startDate || startDate <= now) {
          if (!endDate || endDate >= now) {
            status = 'active';
          } else {
            status = 'expired';
          }
        } else {
          status = 'scheduled';
        }
      }

      return {
        ...announcement,
        computed_status: status,
        is_currently_active: status === 'active',
        days_until_start: startDate && startDate > now ? 
          Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
        days_until_end: endDate && endDate > now ? 
          Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
      };
    });

    return res.status(200).json({ 
      data: announcementsWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in getAnnouncements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

async function createAnnouncement(req: Request, res: Response) {
  try {
    const {
      title,
      content,
      announcement_audience = 'all',
      announcement_type = 'general',
      is_active = true,
      start_date,
      end_date
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ 
        error: 'title and content are required' 
      });
    }

    // Validate dates
    if (start_date && end_date) {
      const startDateTime = new Date(start_date).getTime();
      const endDateTime = new Date(end_date).getTime();
      
      if (startDateTime >= endDateTime) {
        return res.status(400).json({ 
          error: 'end_date must be after start_date' 
        });
      }
    }

    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert([{
        title,
        content,
        announcement_audience,
        announcement_type,
        is_active,
        start_date,
        end_date
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating announcement:', insertError);
      return res.status(500).json({ 
        error: insertError.message,
        details: insertError.details 
      });
    }

    return res.status(201).json({ data: announcement });

  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
}

async function updateAnnouncement(req: Request, res: Response) {
  try {
    const announcementId = req.params?.id || req.body?.id;
    if (!announcementId) {
      return res.status(400).json({ error: 'Announcement ID is required' });
    }

    const {
      title,
      content,
      announcement_audience,
      announcement_type,
      is_active,
      start_date,
      end_date
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (announcement_audience !== undefined) updateData.announcement_audience = announcement_audience;
    if (announcement_type !== undefined) updateData.announcement_type = announcement_type;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;

    // Validate dates if being updated
    if (start_date !== undefined || end_date !== undefined) {
      // Get current values if not provided in update
      const { data: currentAnnouncement } = await supabase
        .from('announcements')
        .select('start_date, end_date')
        .eq('id', announcementId)
        .single();

      const finalStartDate = start_date !== undefined ? start_date : currentAnnouncement?.start_date;
      const finalEndDate = end_date !== undefined ? end_date : currentAnnouncement?.end_date;

      if (finalStartDate && finalEndDate) {
        const startDateTime = new Date(finalStartDate).getTime();
        const endDateTime = new Date(finalEndDate).getTime();
        
        if (startDateTime >= endDateTime) {
          return res.status(400).json({ 
            error: 'end_date must be after start_date' 
          });
        }
      }
    }

    const { data: announcement, error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', announcementId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating announcement:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    return res.status(200).json({ data: announcement });

  } catch (error) {
    console.error('Error in updateAnnouncement:', error);
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
}

async function deleteAnnouncement(req: Request, res: Response) {
  try {
    const announcementId = req.params?.id || req.body?.id;
    if (!announcementId) {
      return res.status(400).json({ error: 'Announcement ID is required' });
    }

    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (deleteError) {
      console.error('Error deleting announcement:', deleteError);
      return res.status(500).json({ 
        error: deleteError.message,
        details: deleteError.details 
      });
    }

    return res.status(200).json({ 
      message: 'Announcement deleted successfully',
      id: announcementId 
    });

  } catch (error) {
    console.error('Error in deleteAnnouncement:', error);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
}

// Publish/Unpublish announcement
export async function handleAnnouncementPublication(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['publish', 'unpublish'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be "publish" or "unpublish"' 
      });
    }

    const is_active = action === 'publish';
    const updateData: any = { 
      is_active
    };

    // If publishing and no start_date is set, set it to now
    if (action === 'publish') {
      const { data: currentAnnouncement } = await supabase
        .from('announcements')
        .select('start_date')
        .eq('id', id)
        .single();

      if (!currentAnnouncement?.start_date) {
        updateData.start_date = new Date().toISOString();
      }
    }

    const { data: announcement, error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating announcement publication status:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    return res.status(200).json({ 
      data: announcement,
      message: `Announcement ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error in handleAnnouncementPublication:', error);
    return res.status(500).json({ error: 'Failed to update announcement publication status' });
  }
}

// Get active announcements (for public consumption)
export async function handleActiveAnnouncements(req: Request, res: Response) {
  try {
    const { announcement_audience = 'all' } = req.query;

    const now = new Date().toISOString();

    let query = supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        announcement_type,
        created_at,
        start_date,
        end_date
      `)
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`);

    // Filter by announcement audience
    if (announcement_audience !== 'all') {
      query = query.or(`announcement_audience.eq.all,announcement_audience.eq.${announcement_audience}`);
    } else {
      query = query.eq('announcement_audience', 'all');
    }

    query = query.order('created_at', { ascending: false });

    const { data: announcements, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching active announcements:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    return res.status(200).json({ data: announcements || [] });

  } catch (error) {
    console.error('Error in handleActiveAnnouncements:', error);
    return res.status(500).json({ error: 'Failed to fetch active announcements' });
  }
}