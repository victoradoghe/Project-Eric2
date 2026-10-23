import { base44 } from '@/api/base44Client';
import { notifyListingPublished } from '@/lib/listingsApi';
import { listingSearchFields } from '@/lib/listingFields';

const num = (value) => (value === '' || value === null || value === undefined ? undefined : Number(value));

export const writeAudit = async (actor, { action, targetType, targetId, targetLabel, details }) => {
  try {
    await base44.entities.AuditLog.create({
      actor_id: actor?.id,
      actor_email: actor?.email,
      action,
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
      details,
    });
  } catch (error) {
    /* audit logging must never block the action */
  }
};

const notifyOwner = async (listing, { title, body }) => {
  if (!listing?.owner_id) return;
  try {
    await base44.entities.Notification.create({
      user_id: listing.owner_id,
      type: 'moderation',
      title,
      body,
      link: '/dashboard/listings',
      read: false,
    });
  } catch (error) {
    /* notification is best effort */
  }
};

export const approveListing = async (actor, listing, note = '') => {
  await base44.entities.Listing.update(listing.id, {
    status: 'published',
    published_date: listing.published_date || new Date().toISOString().slice(0, 10),
    moderation_note: note,
  });
  await writeAudit(actor, {
    action: 'listing.approved',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: note || 'Approved from the moderation queue',
  });
  await notifyOwner(listing, {
    title: 'Your listing is published',
    body: `${listing.title} passed review and is now visible in search.`,
  });
  try {
    await notifyListingPublished(listing.id);
  } catch (error) {
    /* alerts are best effort; publication still stands */
  }
};

export const rejectListing = async (actor, listing, reason) => {
  await base44.entities.Listing.update(listing.id, { status: 'rejected', moderation_note: reason });
  await writeAudit(actor, {
    action: 'listing.rejected',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: reason,
  });
  await notifyOwner(listing, {
    title: 'Your listing was not approved',
    body: `Reason: ${reason}. You can edit the listing and submit it again.`,
  });
};

export const archiveListing = async (actor, listing, reason = '') => {
  await base44.entities.Listing.update(listing.id, { status: 'archived', moderation_note: reason });
  await writeAudit(actor, {
    action: 'listing.archived',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: reason,
  });
  await notifyOwner(listing, {
    title: 'Your listing was archived',
    body: reason || 'An administrator archived this listing. Contact support if you believe this was a mistake.',
  });
};

export const toggleFeatured = async (actor, listing, featured) => {
  await base44.entities.Listing.update(listing.id, { featured });
  await writeAudit(actor, {
    action: featured ? 'listing.featured' : 'listing.unfeatured',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: featured ? 'Added to featured listings' : 'Removed from featured listings',
  });
};

export const verifyListingOwnership = async (actor, listing, verified) => {
  await base44.entities.Listing.update(listing.id, { verification_status: verified ? 'verified' : 'none' });
  await writeAudit(actor, {
    action: verified ? 'listing.ownership_verified' : 'listing.ownership_verification_removed',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: verified ? 'Ownership checked and confirmed' : 'Verification removed',
  });
  if (listing.property_id) {
    try {
      await base44.entities.Property.update(listing.property_id, { ownership_verified: Boolean(verified) });
    } catch (error) {
      /* the listing badge is the record that matters */
    }
  }
  await notifyOwner(listing, {
    title: verified ? 'Your listing is now verified' : 'Verification removed from your listing',
    body: verified
      ? `${listing.title} now shows a verified badge because ownership was confirmed.`
      : `${listing.title} no longer shows a verified badge.`,
  });
};

export const resolveReport = async (actor, report, { status, note }) => {
  await base44.entities.Report.update(report.id, {
    status,
    resolution_note: note,
    handled_by: actor?.email,
  });
  await writeAudit(actor, {
    action: `report.${status}`,
    targetType: 'report',
    targetId: report.id,
    targetLabel: report.target_label || report.target_id,
    details: note,
  });
};

export const updateContactMessage = async (actor, message, { status, note }) => {
  await base44.entities.ContactMessage.update(message.id, {
    status,
    reply_note: note,
    handled_by: actor?.email,
  });
  await writeAudit(actor, {
    action: `contact_message.${status}`,
    targetType: 'contact_message',
    targetId: message.id,
    targetLabel: message.subject || message.email,
    details: note,
  });
};

export const setUserRole = async (actor, targetUser, role) => {
  await base44.entities.User.update(targetUser.id, { role });
  await writeAudit(actor, {
    action: `user.role_${role}`,
    targetType: 'user',
    targetId: targetUser.id,
    targetLabel: targetUser.email,
    details: `Role changed to ${role}`,
  });
};

export const setUserStatus = async (actor, targetUser, status) => {
  await base44.entities.User.update(targetUser.id, { account_status: status });
  await writeAudit(actor, {
    action: `user.${status === 'suspended' ? 'suspended' : 'reactivated'}`,
    targetType: 'user',
    targetId: targetUser.id,
    targetLabel: targetUser.email,
    details: `Account status set to ${status}`,
  });
};

export const adminEditListing = async (actor, listing, { form, images }) => {
  const propertyPayload = {
    title: form.title,
    property_type: form.property_type,
    address: form.address,
    address_visibility: form.address_visibility,
    neighborhood: form.neighborhood,
    city: form.city,
    state: form.state,
    postal_code: form.postal_code,
    latitude: num(form.latitude),
    longitude: num(form.longitude),
    bedrooms: num(form.bedrooms),
    bathrooms: num(form.bathrooms),
    area_sqft: num(form.area_sqft),
    lot_sqft: num(form.lot_sqft),
    year_built: num(form.year_built),
    parking: form.parking,
    furnished: form.furnished || undefined,
    pets_allowed: form.pets_allowed || undefined,
    amenities: form.amenities,
    description: form.description,
    owner_name: form.owner_name,
    owner_role: form.owner_role,
  };

  if (listing.property_id) {
    try {
      await base44.entities.Property.update(listing.property_id, propertyPayload);
    } catch (error) {
      /* the listing record is the one that matters for display */
    }
  }

  const listingPayload = {
    title: form.title,
    description: form.description,
    listing_type: form.listing_type,
    price: num(form.price),
    currency: form.currency,
    rent_frequency: form.listing_type === 'rent' ? form.rent_frequency : undefined,
    deposit: num(form.deposit),
    lease_months: num(form.lease_months),
    available_from: form.available_from || undefined,
    open_house_at: form.open_house_at || undefined,
    accepts_applications: Boolean(form.accepts_applications),
    images: images || [],
    source: form.source,
    owner_name: form.owner_name,
    owner_role: form.owner_role,
    property_type: form.property_type,
    bedrooms: num(form.bedrooms),
    bathrooms: num(form.bathrooms),
    area_sqft: num(form.area_sqft),
    lot_sqft: num(form.lot_sqft),
    year_built: num(form.year_built),
    parking: form.parking,
    furnished: form.furnished || undefined,
    pets_allowed: form.pets_allowed || undefined,
    amenities: form.amenities,
    address: form.address,
    address_visibility: form.address_visibility,
    neighborhood: form.neighborhood,
    city: form.city,
    state: form.state,
    postal_code: form.postal_code,
    latitude: num(form.latitude),
    longitude: num(form.longitude),
    ...listingSearchFields(form),
  };

  const updated = await base44.entities.Listing.update(listing.id, listingPayload);

  await writeAudit(actor, {
    action: 'listing.admin_edited',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: form.title,
    details: 'Listing details edited by an administrator',
  });

  await notifyOwner(listing, {
    title: 'Your listing was edited by an administrator',
    body: `${form.title} was updated by a Dwellmark administrator.`,
  });

  return updated;
};

export const adminUpdateListingPrice = async (actor, listing, price, currency) => {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Enter a valid price.');
  }
  const payload = {
    price: numericPrice,
    currency: currency || listing.currency || 'USD',
  };
  const updated = await base44.entities.Listing.update(listing.id, payload);

  await writeAudit(actor, {
    action: 'listing.price_updated',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: `Price updated to ${currency || listing.currency || 'USD'} ${numericPrice} by an administrator`,
  });

  await notifyOwner(listing, {
    title: 'Your listing price was updated',
    body: `The price of "${listing.title}" was changed by a Dwellmark administrator.`,
  });

  return updated;
};

export const adminDeleteListing = async (actor, listing, reason = '') => {
  await base44.entities.Listing.delete(listing.id);
  if (listing.property_id) {
    try {
      await base44.entities.Property.delete(listing.property_id);
    } catch (error) {
      /* the listing is the record that matters */
    }
  }
  await writeAudit(actor, {
    action: 'listing.deleted',
    targetType: 'listing',
    targetId: listing.id,
    targetLabel: listing.title,
    details: reason || 'Listing deleted by an administrator',
  });
  await notifyOwner(listing, {
    title: 'Your listing was removed',
    body: reason
      ? `${listing.title} was removed by a Dwellmark administrator. Reason: ${reason}`
      : `${listing.title} was removed by a Dwellmark administrator.`,
  });
};