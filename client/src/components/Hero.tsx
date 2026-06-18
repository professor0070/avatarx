import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronDown } from 'lucide-react';

export function Hero() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const categories = [
    'All Categories',
    '3D Models',
    'Textures',
    'Rooms',
    'Outfits',
    'Animations',
    'Custom Services',
    'Game Credits',
    'Account Services',
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory === 'All Categories' ? '' : selectedCategory}`);
    }
  };

  return (
    <div className="relative min-h-[500px] md:min-h-[700px] overflow-hidden bg-[#020202] w-[calc(100%+2rem)] ml-[-1rem] md:w-screen md:ml-[calc(50%-50vw)]">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://res.cloudinary.com/dc68wrpii/video/upload/f_auto,q_auto,so_0/v1779906687/mp4_ytmnee.jpg"
          className="w-full h-full object-cover opacity-55"
        >
          <source src="https://res.cloudinary.com/dc68wrpii/video/upload/f_auto,q_auto/v1779906687/mp4_ytmnee.mp4" type="video/mp4" />
        </video>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-20 flex items-center justify-center min-h-[500px] md:min-h-[600px] px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold text-white mb-4"
          >
            Find the perfect <span className="text-green-400">Virtual</span> services
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-200 mb-8"
          >
            Millions of people use AvatarX to turn their ideas into reality
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full md:w-48 px-4 py-4 bg-white text-left rounded-lg flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="truncate">{selectedCategory}</span>
                  <ChevronDown className="w-5 h-5 flex-shrink-0" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What service are you looking for today?"
                  aria-label="Search for services"
                  className="w-full px-4 py-4 pr-12 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-green-600 transition-colors"
                >
                  <Search className="w-6 h-6" />
                </button>
              </div>
            </form>

            {/* Popular Searches */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-gray-400 text-sm">Popular:</span>
              {['3D Models', 'Custom Rooms', 'Outfits', 'Animations'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setSearchQuery(term);
                    navigate(`/browse?search=${encodeURIComponent(term)}`);
                  }}
                  className="text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
