export function teamInviteUrl(referralCode: string, origin = "https://games.brainwaveai.my") {
  return `${origin}/join?ref=${encodeURIComponent(referralCode)}`;
}

export function teamInviteMessage(inviteLink: string) {
  return [
    "Come join my Brainwave Games World Cup prediction team.",
    "We can predict together, collect points, and compete for prizes.",
    inviteLink,
  ].join("\n\n");
}

export function whatsappTeamInviteUrl(inviteLink: string) {
  return `https://wa.me/?text=${encodeURIComponent(teamInviteMessage(inviteLink))}`;
}
