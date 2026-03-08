'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RecentSearch {
  name: string;
  phone?: string;
  id?: number;
}

interface AutocompleteResult {
  id: number;
  name: string;
  phone?: string;
  customer_number?: number;
}

export function useScheduleSearch() {
  const [searchInput, setSearchInput] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchDropdownPosition, setSearchDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<'name' | 'phone'>('name');
  const [isSearching, setIsSearching] = useState(false);
  const [searchAutocompleteResults, setSearchAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [isSearchAutocompleteLoading, setIsSearchAutocompleteLoading] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading recent searches:', err);
    }
  }, []);

  // Handle customer autocomplete search (debounced)
  useEffect(() => {
    const searchTerm = searchInput.trim();
    if (!searchTerm || searchTerm.length < 1) {
      setSearchAutocompleteResults([]);
      return;
    }

    setIsSearchAutocompleteLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=10`);
        const data = await res.json();
        if (res.ok && data.customers) {
          setSearchAutocompleteResults(data.customers);
        } else {
          setSearchAutocompleteResults([]);
        }
      } catch (err) {
        console.error('Error fetching autocomplete:', err);
        setSearchAutocompleteResults([]);
      } finally {
        setIsSearchAutocompleteLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const saveRecentSearch = useCallback(
    (name: string, phone?: string, id?: number) => {
      try {
        const newSearch = { name, phone, id };
        const updated = [
          newSearch,
          ...recentSearches.filter((s) => s.id !== id && s.name !== name),
        ].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving recent search:', err);
      }
    },
    [recentSearches],
  );

  const handleDeleteRecentSearch = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = recentSearches.filter((_, idx) => idx !== index);
      setRecentSearches(updated);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving recent searches:', err);
      }
    },
    [recentSearches],
  );

  return {
    searchInput,
    setSearchInput,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    searchDropdownPosition,
    setSearchDropdownPosition,
    searchInputRef,
    recentSearches,
    searchCriteria,
    setSearchCriteria,
    isSearching,
    setIsSearching,
    searchAutocompleteResults,
    isSearchAutocompleteLoading,
    setRecentSearches,
    saveRecentSearch,
    handleDeleteRecentSearch,
  };
}
