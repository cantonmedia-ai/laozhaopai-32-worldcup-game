import { NextResponse, type NextRequest } from "next/server";
import {
  MAX_PLAYER_ENTRIES,
  getCountryByCode,
  getCountryByName,
  isValidWhatsapp,
  normalizeWhatsapp,
} from "@/lib/champion-guess";
import { ensureChampionSettings } from "@/lib/champion-admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const whatsapp = String(body.whatsapp ?? "").trim();
    const email = String(body.email ?? "").trim();
    const country =
      getCountryByCode(String(body.selected_country_code ?? "")) ||
      getCountryByName(String(body.selected_country ?? ""));

    if (!name) {
      return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
    }

    if (!isValidWhatsapp(whatsapp)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid WhatsApp number." },
        { status: 400 },
      );
    }

    if (!country) {
      return NextResponse.json(
        { ok: false, error: "Please select a valid champion country." },
        { status: 400 },
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email or leave it blank." },
        { status: 400 },
      );
    }

    const settings = await ensureChampionSettings();
    const closedByTime =
      settings.submission_close_at && new Date(settings.submission_close_at).getTime() <= Date.now();

    if (!settings.submission_open || closedByTime) {
      return NextResponse.json(
        { ok: false, error: "Submission is already closed." },
        { status: 403 },
      );
    }

    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
    const supabase = createServiceClient();
    const { count: playerCount, error: countError } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true });

    if (countError) throw countError;

    if ((playerCount ?? 0) >= MAX_PLAYER_ENTRIES) {
      return NextResponse.json(
        { ok: false, error: "This campaign is full. 500 players have already joined." },
        { status: 403 },
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");
    const deviceId = request.headers.get("x-device-id");

    const { data, error } = await supabase
      .from("players")
      .insert({
        name,
        whatsapp,
        normalized_whatsapp: normalizedWhatsapp,
        email: email || null,
        selected_country: country.name,
        selected_country_code: country.code,
        group_name: country.group,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_id: deviceId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { ok: false, error: "This WhatsApp number has already joined." },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true, playerId: data.id });
  } catch (error) {
    console.error("champion_join_failed", error);
    return NextResponse.json(
      { ok: false, error: "Submission failed. Please try again." },
      { status: 500 },
    );
  }
}
