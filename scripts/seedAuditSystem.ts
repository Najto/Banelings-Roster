import { supabase } from '../services/supabaseClient';
import { syncAvailableFields } from '../services/dataDiscoveryService';

async function seedAdminUser() {
  console.log('Creating admin user...');

  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', 'admin')
    .maybeSingle();

  if (existing) {
    console.log('Admin user already exists');
    return existing.id;
  }

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: 'admin',
      password_hash: 'admin',
      is_admin: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }

  console.log('Admin user created:', data.email);
  return data.id;
}

async function seedColumnDefinitions() {
  console.log('Syncing column definitions from character data...');

  const result = await syncAvailableFields();
  console.log(`Column definitions synced: ${result.added} added, ${result.updated} updated`);
}

async function seedSystemPresets(adminId: string) {
  console.log('Creating system presets...');

  const presets = [
    {
      preset_name: 'Default Audit',
      description: 'Standard audit view with essential columns',
      is_default: true,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'playerName', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'spec', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'itemLevel', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'mPlusRating', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'lastSeen', column_order: 6, is_visible: true, column_width: 'auto', alignment: 'right', is_sortable: true }
      ]
    },
    {
      preset_name: 'Gear Deep Dive',
      description: 'Detailed gear analysis with quality metrics',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'itemLevel', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_avgGearItemLevel', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_lowestGearSlotLevel', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_missingEnchants', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_missingGems', column_order: 6, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_tierSetCount', column_order: 7, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_gearQualityScore', column_order: 8, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true }
      ]
    },
    {
      preset_name: 'Progress Tracking',
      description: 'M+ and raid progress overview',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'itemLevel', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'mPlusRating', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'weeklyTenPlusCount', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_mythicPlusKeyLevel', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_raidMythicBosses', column_order: 6, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_greatVaultUnlocked', column_order: 7, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true }
      ]
    },
    {
      preset_name: 'Activity Monitor',
      description: 'Weekly activity and engagement tracking',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'weeklyTenPlusCount', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_weeklyActivityScore', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'worldProgress_delvesDone', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'worldProgress_worldQuestsDone', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'lastSeen', column_order: 6, is_visible: true, column_width: 'auto', alignment: 'right', is_sortable: true }
      ]
    },
    {
      preset_name: 'Stats Overview',
      description: 'Character stats comparison',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'spec', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'itemLevel', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'stats_crit', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'stats_haste', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'stats_mastery', column_order: 6, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'stats_versatility', column_order: 7, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true }
      ]
    },
    {
      preset_name: 'PvP Focus',
      description: 'PvP ratings and statistics',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'itemLevel', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'pvpStats_honorLevel', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'pvpStats_honorableKills', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_pvpRatingHighest', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true }
      ]
    },
    {
      preset_name: 'Collections',
      description: 'Mounts, pets, toys, and achievements',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'achievementPoints', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'collections_mounts', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'collections_pets', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'collections_toys', column_order: 5, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'calc_collectionScore', column_order: 6, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true }
      ]
    },
    {
      preset_name: 'Minimal',
      description: 'Minimal view with only essential information',
      is_default: false,
      is_system: true,
      created_by: adminId,
      columns: [
        { column_key: 'name', column_order: 1, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'spec', column_order: 2, is_visible: true, column_width: 'auto', alignment: 'left', is_sortable: true },
        { column_key: 'itemLevel', column_order: 3, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true },
        { column_key: 'mPlusRating', column_order: 4, is_visible: true, column_width: 'auto', alignment: 'center', is_sortable: true }
      ]
    }
  ];

  for (const preset of presets) {
    const { data: existing } = await supabase
      .from('audit_presets')
      .select('id')
      .eq('preset_name', preset.preset_name)
      .maybeSingle();

    if (existing) {
      console.log(`Preset "${preset.preset_name}" already exists`);
      continue;
    }

    const { data: newPreset, error: presetError } = await supabase
      .from('audit_presets')
      .insert({
        preset_name: preset.preset_name,
        description: preset.description,
        is_default: preset.is_default,
        is_system: preset.is_system,
        created_by: preset.created_by
      })
      .select()
      .single();

    if (presetError || !newPreset) {
      console.error(`Error creating preset "${preset.preset_name}":`, presetError);
      continue;
    }

    const columns = preset.columns.map(col => ({
      preset_id: newPreset.id,
      ...col,
      custom_format_override: {}
    }));

    const { error: columnsError } = await supabase
      .from('audit_preset_columns')
      .insert(columns);

    if (columnsError) {
      console.error(`Error creating columns for preset "${preset.preset_name}":`, columnsError);
    } else {
      console.log(`Created preset: "${preset.preset_name}" with ${columns.length} columns`);
    }
  }
}

async function main() {
  console.log('Starting audit system seed...');

  try {
    const adminId = await seedAdminUser();

    await seedColumnDefinitions();

    await seedSystemPresets(adminId);

    console.log('Audit system seed completed successfully!');
    console.log('\nDefault admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin');
    console.log('\nPlease change these credentials after first login!');
  } catch (error) {
    console.error('Error seeding audit system:', error);
    process.exit(1);
  }
}

main();
