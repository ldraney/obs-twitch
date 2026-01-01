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

  const { username, message, color, badges = [] } = data;

  console.log(`💬 Rendering: ${username}: ${message}`);

  // Create message element
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message show'; // Start visible
  msgEl.innerHTML = `
    <span class="chat-badges">${formatBadges(badges)}</span>
    <span class="chat-username" style="color: ${color || getRandomColor()}">${escapeHtml(username)}</span>
    <span class="chat-separator">:</span>
    <span class="chat-text">${escapeHtml(message)}</span>
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

function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
