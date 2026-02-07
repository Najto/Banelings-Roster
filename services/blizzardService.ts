
import { WoWClass } from '../types';

const CLIENT_ID = "6297890373d64a43920eebba7395ddd7"; 
const CLIENT_SECRET = "2aik8t8euM3mGGYDvUrELn9lNVarodGr";

export interface BlizzardCharData {
  name: string;
  itemLevel: number;
  className: WoWClass;
  realm: string;
}

export const fetchBlizzardToken = async (): Promise<string> => {
  // Note: Real browser implementation would need a proxy to avoid CORS 
  // with Blizzard's OAuth endpoint. This follows the logic of the GAS script.
  try {
    const response = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      headers: {
        Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      },
    });
    const data = await response.json();
    return data.access_token;
  } catch (e) {
    console.error("Auth failed", e);
    return "";
  }
};

export const getCharacterData = async (token: string, realm: string, name: string): Promise<BlizzardCharData | null> => {
  const url = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}?namespace=profile-eu&locale=en_GB`;
  
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    
    const data = await res.json();
    return {
      name: data.name,
      itemLevel: data.equipped_item_level,
      className: data.character_class.name as WoWClass,
      realm: data.realm.name
    };
  } catch (e) {
    return null;
  }
};
