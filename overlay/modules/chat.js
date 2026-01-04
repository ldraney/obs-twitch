/**
 * Chat Display Module
 *
 * Persistent chatbox showing Twitch chat messages.
 * Messages stay visible and scroll like a real chat.
 */

const MAX_MESSAGES = 50; // Keep last 50 messages

let chatContainer = null;
const messages = [];

/**
 * Initialize chat display
 */
export function init(container) {
  chatContainer = container;
  console.log('💬 Chat module initialized');
}

/**
 * Add a chat message to the display
 */
export function addMessage(data) {
  if (!chatContainer) {
    console.error('Chat container not initialized');
    return;
  }

  const { username, message, color, badges = [], emotes = [] } = data;

  console.log(`💬 Rendering: ${username}: ${message}`);
  console.log(`🎭 Emotes received:`, emotes);
  console.log(`🎭 Full data:`, JSON.stringify(data));

  // Create message element
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message show'; // Start visible
  msgEl.innerHTML = `
    <span class="chat-badges">${formatBadges(badges)}</span>
    <span class="chat-username" style="color: ${color || getRandomColor()}">${escapeHtml(username)}</span>
    <span class="chat-separator">:</span>
    <span class="chat-text">${formatMessageWithEmotes(message, emotes)}</span>
  `;

  // Add to container
  chatContainer.appendChild(msgEl);
  messages.push(msgEl);

  // Remove oldest if too many (but keep them visible longer)
  while (messages.length > MAX_MESSAGES) {
    const oldest = messages.shift();
    if (oldest.parentNode) {
      oldest.parentNode.removeChild(oldest);
    }
  }

  // Auto-scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatBadges(badges) {
  return badges.map(badge => {
    switch (badge) {
      case 'broadcaster': return '<span class="badge badge-broadcaster" title="Broadcaster">📺</span>';
      case 'moderator': return '<span class="badge badge-mod" title="Moderator">🗡️</span>';
      case 'vip': return '<span class="badge badge-vip" title="VIP">💎</span>';
      case 'subscriber': return '<span class="badge badge-sub" title="Subscriber">⭐</span>';
      default: return '';
    }
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format message text with Twitch emotes rendered as images
 */
function formatMessageWithEmotes(message, emotes) {
  if (!emotes || emotes.length === 0) {
    return escapeHtml(message);
  }

  // Sort emotes by start position ascending for building the string
  const sortedEmotes = [...emotes].sort((a, b) => a.start - b.start);

  let result = '';
  let lastEnd = 0;

  for (const emote of sortedEmotes) {
    const { id, start, end } = emote;
    // Escape text before this emote
    result += escapeHtml(message.substring(lastEnd, start));
    // Add emote image
    const emoteName = message.substring(start, end + 1);
    const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`;
    result += `<img class="chat-emote" src="${emoteUrl}" alt="${escapeHtml(emoteName)}" title="${escapeHtml(emoteName)}">`;
    lastEnd = end + 1;
  }

  // Escape remaining text after last emote
  result += escapeHtml(message.substring(lastEnd));

  return result;
}

function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
