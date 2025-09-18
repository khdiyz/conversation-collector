import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Save, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to get current date in dd.mm.yyyy format, Asia/Tashkent
function getTashkentDate() {
  const now = new Date();
  const tashkentDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Tashkent'
  }).format(now);
  return tashkentDate;
}

// LocalStorage helpers
const STORAGE_KEY = 'conversation-collector-data';

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
    return [];
  }
}

const ConversationDataCollector = () => {
  // Sample subcategories - you can modify this list
const subcategories = [
  'Запрос баланса',
  'Способы оплаты',
  'Вопросы, связанные с личным кабинетом',

  'Информация о тарифном плане',
  'Смена тарифа',
  'Дополнительные услуги (например, статический IP)',

  'Заявка на новое подключение',
  'Помощь с регистрацией, использованием, поиском контента',
  'Запросы на установку/расширение GPON',
  'Управление кабелем или оборудованием',

  'Смена пароля / логина / номера телефона',
  'Восстановление аккаунта',
  'Помощь с регистрацией аккаунта',
  'Управление договором (пауза / восстановление / расторжение)',

  'Расторжение или перерегистрация договора',
  'Приостановка услуги',

  'Заказать обратный звонок',
  'Жалобы на персонал или качество обслуживания',
  'Предложения по улучшению (например, добавить контент или услуги)',

  'Адрес компании, часы работы, электронная почта, телефон',
  'Вопросы по заявкам на обслуживание',

  'Информация о тарифах ЦТВ',
  'Статус подписки ЦТВ / обновления',
  'Покупка пульта дистанционного управления'
];

  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [currentConversation, setCurrentConversation] = useState([]);
  const [allData, setAllData] = useState(() => loadFromLocalStorage());
  const [currentQA, setCurrentQA] = useState({ question: '', answer: '' });
  const [collectionDate, setCollectionDate] = useState(getTashkentDate());
  const [showData, setShowData] = useState(false);

  // Auto-save to localStorage whenever allData changes
  useEffect(() => {
    saveToLocalStorage(allData);
  }, [allData]);

  // Get conversation statistics
  const getConversationStats = () => {
    const stats = {};
    allData.forEach(item => {
      if (!stats[item.Subcategory]) {
        stats[item.Subcategory] = new Set();
      }
      stats[item.Subcategory].add(item.ConversationNumber);
    });
    
    // Convert sets to counts
    Object.keys(stats).forEach(key => {
      stats[key] = stats[key].size;
    });
    
    return stats;
  };

  const getNextConversationNumber = (subcategory) => {
    const stats = getConversationStats();
    return (stats[subcategory] || 0) + 1;
  };

  const addQAPair = () => {
    if (!currentQA.question.trim() || !currentQA.answer.trim()) {
      alert('Please fill in both question and answer fields.');
      return;
    }

    const newQA = {
      ...currentQA,
      order: currentConversation.length + 1
    };

    setCurrentConversation([...currentConversation, newQA]);
    setCurrentQA({ question: '', answer: '' });
  };

  const removeQAPair = (index) => {
    const updated = currentConversation.filter((_, i) => i !== index);
    // Update order numbers
    const reordered = updated.map((qa, i) => ({ ...qa, order: i + 1 }));
    setCurrentConversation(reordered);
  };

  const saveConversation = () => {
    if (!selectedSubcategory) {
      alert('Please select a subcategory.');
      return;
    }

    if (currentConversation.length === 0) {
      alert('Please add at least one Q&A pair.');
      return;
    }

    const stats = getConversationStats();
    const conversationCount = stats[selectedSubcategory] || 0;

    if (conversationCount >= 3) {
      alert(`You have already collected 3 conversations for ${selectedSubcategory}. Maximum reached.`);
      return;
    }

    const conversationNumber = getNextConversationNumber(selectedSubcategory);

    const conversationData = currentConversation.map(qa => ({
      Subcategory: selectedSubcategory,
      ConversationNumber: conversationNumber,
      Order: qa.order,
      Question: qa.question,
      Answer: qa.answer,
      CollectionDate: collectionDate
    }));

    setAllData([...allData, ...conversationData]);
    setCurrentConversation([]);
    setSelectedSubcategory('');
    alert(`Conversation ${conversationNumber} saved for ${selectedSubcategory}!`);
  };

  const exportToExcel = () => {
    if (allData.length === 0) {
      alert('No data to export. Please collect some conversations first.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Conversations');
    
    // Auto-size columns
    const colWidths = [
      { wch: 20 }, // Subcategory
      { wch: 15 }, // ConversationNumber
      { wch: 8 },  // Order
      { wch: 50 }, // Question
      { wch: 50 }, // Answer
      { wch: 15 }  // CollectionDate
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `conversation_data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all collected data? This cannot be undone.')) {
      setAllData([]);
      setCurrentConversation([]);
      setSelectedSubcategory('');
      // Clear localStorage as well
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const stats = getConversationStats();
  const totalConversations = Object.values(stats).reduce((sum, count) => sum + count, 0);
  const completedSubcategories = Object.values(stats).filter(count => count >= 3).length;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Conversation Data Collector</h1>
        
        {/* Progress Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Progress Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Conversations:</span> {totalConversations}/78
            </div>
            <div>
              <span className="font-medium">Completed Subcategories:</span> {completedSubcategories}/26
            </div>
            <div>
              <span className="font-medium">Progress:</span> {Math.round((totalConversations / 78) * 100)}%
            </div>
          </div>
        </div>

        {/* Subcategory Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subcategory
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a subcategory...</option>
              {subcategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({stats[cat] || 0}/3 conversations)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Date
            </label>
            <input
              type="text"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="dd.mm.yyyy"
            />
          </div>
        </div>

        {selectedSubcategory && (
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Adding Conversation {getNextConversationNumber(selectedSubcategory)} for {selectedSubcategory}
            </h3>

            {/* Current Q&A Input */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question
                </label>
                <textarea
                  value={currentQA.question}
                  onChange={(e) => setCurrentQA({...currentQA, question: e.target.value})}
                  placeholder="Enter the question..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer
                </label>
                <textarea
                  value={currentQA.answer}
                  onChange={(e) => setCurrentQA({...currentQA, answer: e.target.value})}
                  placeholder="Enter the answer..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                />
              </div>

              <button
                onClick={addQAPair}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Q&A Pair
              </button>
            </div>

            {/* Current Conversation Preview */}
            {currentConversation.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-3">
                  Current Conversation ({currentConversation.length} Q&A pairs)
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {currentConversation.map((qa, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-600">Q&A {qa.order}</span>
                        <button
                          onClick={() => removeQAPair(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Q:</span>
                          <p className="text-sm text-gray-600 ml-4">{qa.question}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">A:</span>
                          <p className="text-sm text-gray-600 ml-4">{qa.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={saveConversation}
                  className="mt-4 flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Save size={16} />
                  Save Conversation
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t pt-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowData(!showData)}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Eye size={16} />
            {showData ? 'Hide' : 'Show'} Collected Data ({allData.length} entries)
          </button>

          <button
            onClick={exportToExcel}
            disabled={allData.length === 0}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Export to Excel
          </button>

          <button
            onClick={clearAllData}
            disabled={allData.length === 0}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Clear All Data
          </button>
        </div>

        {/* Data Preview */}
        {showData && allData.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Collected Data Preview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-200 px-4 py-2 text-left">Subcategory</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Conv#</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Order</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Question</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Answer</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allData.slice(-10).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">{item.Subcategory}</td>
                      <td className="border border-gray-200 px-4 py-2">{item.ConversationNumber}</td>
                      <td className="border border-gray-200 px-4 py-2">{item.Order}</td>
                      <td className="border border-gray-200 px-4 py-2 max-w-xs truncate">{item.Question}</td>
                      <td className="border border-gray-200 px-4 py-2 max-w-xs truncate">{item.Answer}</td>
                      <td className="border border-gray-200 px-4 py-2">{item.CollectionDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allData.length > 10 && (
                <p className="text-sm text-gray-600 mt-2">Showing last 10 entries. Total: {allData.length}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationDataCollector;