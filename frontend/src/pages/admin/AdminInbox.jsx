import React, { useEffect, useState } from 'react';
import { MessageSquare, User, Building2 } from 'lucide-react';
import { businessChatAPI } from '../../services/api';
import ChatWindow from '../../components/chat/ChatWindow';
import toast from 'react-hot-toast';

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function RoomRow({ room, active, onClick }) {
  const label = room.type === 'admin_business' ? 'BookAm Support' : (room.consumer_name || 'Customer');
  const sub = room.type === 'admin_business' ? 'Platform support' : (room.consumer_email || '');
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${
        active ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400 text-sm font-bold">
        {room.type === 'admin_business' ? '⚑' : (label[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{label}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtTime(room.last_message_at)}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{room.last_message || sub || 'No messages yet'}</p>
      </div>
    </button>
  );
}

export default function AdminInbox() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessChatAPI.getRooms()
      .then(setRooms)
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));

    const poll = setInterval(() => {
      businessChatAPI.getRooms().then(setRooms).catch(() => {});
    }, 8000);
    return () => clearInterval(poll);
  }, []);

  const activeRoomData = rooms.find(r => r.id === activeRoom);

  const chatTitle = activeRoomData
    ? activeRoomData.type === 'admin_business'
      ? 'BookAm Support'
      : (activeRoomData.consumer_name || 'Customer')
    : '';

  return (
    <div className="animate-fade-in h-[calc(100vh-8rem)] flex gap-4">
      {/* Room list */}
      <div className="w-72 flex-shrink-0 card p-0 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Customers will message you from your booking page</p>
            </div>
          ) : (
            rooms.map(room => (
              <RoomRow key={room.id} room={room} active={room.id === activeRoom} onClick={() => setActiveRoom(room.id)} />
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 min-w-0">
        {activeRoom ? (
          <ChatWindow
            roomId={activeRoom}
            currentSenderType="business"
            fetchMessages={businessChatAPI.getMessages}
            sendMessage={businessChatAPI.sendMessage}
            title={chatTitle}
            subtitle={activeRoomData?.type === 'admin_business' ? 'Platform support channel' : activeRoomData?.consumer_email}
          />
        ) : (
          <div className="h-full card flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600 dark:text-gray-300">Select a conversation</p>
            <p className="text-sm mt-1">Choose a chat from the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
