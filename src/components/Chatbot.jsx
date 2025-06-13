import React, { useState, useEffect, useRef } from 'react';
// Assurez-vous que 'Bot' est importé ici
import { MessageCircle, X, ChefHat, User, Bot, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Composant pour l'animation de chargement
const LoadingAnimation = () => (
  <div className="flex items-center space-x-1 justify-center py-2">
    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
  </div>
);

const Chatbot = () => {
  const { userId, appId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoReadEnabled, setIsAutoReadEnabled] = useState(false);
  const [speechRate, setSpeechRate] = useState(1); // Default speech rate
  const [showSettings, setShowSettings] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);

  const messagesEndRef = useRef(null);

  // Scroll to bottom on new message or loading state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Read message aloud if auto-read is enabled
  useEffect(() => {
    if (isAutoReadEnabled && messages.length > 0 && messages[messages.length - 1].bot && !isLoading) {
      const lastBotMessage = messages[messages.length - 1].bot;
      speak(lastBotMessage);
    }
  }, [messages, isAutoReadEnabled, isLoading]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance();
      utterance.text = text.replace(/<[^>]*>?/gm, ''); // Remove HTML tags for speech
      utterance.lang = 'fr-FR'; // Set language to French
      utterance.rate = speechRate; // Set speech rate
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-speech not supported in this browser.');
    }
  };

  // Formatter les messages pour gérer **texte** (gras), *texte* (italique ou gras, ici gras pour simplicité), et les retours à la ligne
  const formatMessage = (text) => {
    if (!text) return '';
    // Replace **text** with strong tag
    let formattedText = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Replace *text* or * text * with strong tag (or em for italic)
    // The user's request for *moto* to be gray is unusual for markdown.
    // Standard markdown typically renders *text* as italic or bold.
    // Sticking to bold for simplicity and common markdown rendering.
    formattedText = formattedText.replace(/\*([^\n*]+?)\*/g, '<strong>$1</strong>');
    // Replace newlines with <br />
    formattedText = formattedText.replace(/\n/g, '<br />');
    return formattedText;
  };

  const predefinedSuggestions = [
    "Quels sont les membres de ma famille et leurs antécédents médicaux ?",
    "Qu'y a-t-il dans mon stock ?",
    "Montre-moi une recette de plat principal.",
    "Quel est le planning des repas cette semaine ?",
    "Ajoute des pommes à ma liste de courses.",
  ];

  const sendMessage = async (question = input) => {
    if (!question.trim() || !userId || !appId) return;

    // Stop ongoing speech if any
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const newMessage = { user: question, bot: null, imageUrl: null };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);
    setSuggestedQuestions([]); // Clear suggestions when sending new message

    try {
      const response = await fetch('https://backend-react-1-67hk.onrender.com/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, appId, prompt: question, conversationHistory: messages }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...newMessage, bot: formatMessage(data.message), imageUrl: data.imageUrl, format: data.format },
        ]);
        // Set generic suggestions after bot response
        setSuggestedQuestions(predefinedSuggestions);
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...newMessage, bot: formatMessage('Erreur : ' + data.error) },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...newMessage, bot: formatMessage('Erreur de connexion au serveur.') },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestionClick = (question) => {
    setInput(question); // Set input for visual feedback
    sendMessage(question);
  };

  return (
    <>
      {/* Floating Chatbot Icon - C'est ICI que le changement doit être fait */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-110"
        title="Ouvrir le chatbot"
      >
        {/* Remplacer MessageCircle par Bot */}
        <Bot className="w-6 h-6" />
      </button>

      {/* Chatbot Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-full md:w-[450px] lg:w-[500px] h-[calc(100vh-80px)] sm:h-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out transform translate-y-0 opacity-100">
          {/* Header */}
          <div className="flex items-center justify-between p-4 py-5 bg-gradient-to-r from-emerald-500 to-green-600 text-gray-900 dark:text-white shadow-md">
            <div className="flex items-center space-x-3">
              <Bot className="w-7 h-7" />
              <div>
                <h3 className="text-lg font-bold">MealBloom Assistant</h3>
                <p className="text-xs opacity-90">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Paramètres"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Overlay */}
          {showSettings && (
            <div className="absolute inset-0 bg-white dark:bg-gray-800 z-10 flex flex-col p-4 rounded-b-2xl">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paramètres de lecture</h4>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700 dark:text-gray-300">Lecture automatique</span>
                <label className="inline-flex relative items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isAutoReadEnabled}
                    onChange={() => setIsAutoReadEnabled(!isAutoReadEnabled)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    {isAutoReadEnabled ? <Volume2 className="w-5 h-5 text-green-600" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
                  </span>
                </label>
              </div>
              <div className="mb-4">
                <label htmlFor="speech-rate" className="block text-gray-700 dark:text-gray-300 mb-2">
                  Vitesse de lecture ({speechRate.toFixed(1)}x)
                </label>
                <input
                  type="range"
                  id="speech-rate"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="mt-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Fermer les paramètres
              </button>
            </div>
          )}

          {/* Chat Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
            {messages.map((msg, index) => (
              <div key={index} className="flex flex-col space-y-2">
                {/* User Message */}
                <div className="flex items-start justify-end">
                  <div className="max-w-[75%] bg-blue-500 text-white rounded-xl rounded-br-none p-3 text-sm shadow-md flex items-center space-x-2">
                    <p>{msg.user}</p>
                    <User className="w-5 h-5 ml-auto flex-shrink-0" />
                  </div>
                </div>

                {/* Bot Message */}
                {msg.bot && (
                  <div className="flex items-start justify-start">
                    <div className="max-w-[75%] bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl rounded-bl-none p-3 text-sm shadow-md flex items-start space-x-2">
                      <Bot className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div dangerouslySetInnerHTML={{ __html: msg.bot }} />
                        {msg.format === 'recipe' && msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Recette"
                            className="mt-2 rounded-lg max-w-full h-auto object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[70%] bg-gray-200 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-500 dark:text-gray-600">
                  <LoadingAnimation />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />

            {/* Suggested Questions */}
            {suggestedQuestions.length > 0 && !isLoading && (
              <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Suggestions :</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuestionClick(q)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Posez votre question..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors shadow-md"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;