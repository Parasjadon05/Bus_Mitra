import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { SearchSuggestion } from '@/services/searchService'
import { MapPin, Loader2 } from 'lucide-react'
import { searchService } from '@/services/searchService'

interface BusStopsAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function BusStopsAutocomplete({
  value,
  onChange,
  placeholder = "Enter each bus stop on a new line",
  className = ""
}: BusStopsAutocompleteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [currentLine, setCurrentLine] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Get the current line where cursor is positioned
  const getCurrentLine = useCallback((text: string, cursorPos: number) => {
    const lines = text.split('\n')
    let currentPos = 0
    
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1 // +1 for newline
      if (currentPos + lineLength > cursorPos) {
        return {
          lineIndex: i,
          lineText: lines[i],
          lineStart: currentPos,
          lineEnd: currentPos + lines[i].length
        }
      }
      currentPos += lineLength
    }
    
    return {
      lineIndex: lines.length - 1,
      lineText: lines[lines.length - 1],
      lineStart: currentPos - lines[lines.length - 1].length - 1,
      lineEnd: currentPos - 1
    }
  }, [])

  // Get the last line (simpler approach)
  const getLastLine = useCallback((text: string) => {
    const lines = text.split('\n')
    return lines[lines.length - 1] || ''
  }, [])

  // Search for suggestions
  const searchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    setIsLoading(true)
    
    try {
      const results = await searchService.searchAddresses(query, 5)
      setSuggestions(results)
      setShowDropdown(results.length > 0)
      updateDropdownPosition()
    } catch (error) {
      setSuggestions([])
      setShowDropdown(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle textarea changes
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPos = e.target.selectionStart
    
    onChange(newValue)
    
    // Get current line based on cursor position
    const lineInfo = getCurrentLine(newValue, newCursorPos)
    const lineText = lineInfo.lineText.trim()
    
    setCurrentLine(lineText)
    setCursorPosition(newCursorPos)
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      searchSuggestions(lineText)
    }, 300) // 300ms debounce
  }

  // Update dropdown position based on cursor position
  const updateDropdownPosition = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const rect = textarea.getBoundingClientRect()
      
      // Calculate position based on cursor position
      const lineInfo = getCurrentLine(value, cursorPosition)
      const lineHeight = 20 // Approximate line height
      const charWidth = 8 // Approximate character width
      
      // Position below the current line
      const top = rect.top + (lineInfo.lineIndex * lineHeight) + lineHeight + 5
      // Position at the end of the current line text
      const left = rect.left + (lineInfo.lineText.length * charWidth)
      
      setDropdownPosition({ top, left })
    }
  }, [value, cursorPosition, getCurrentLine])

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    const lineInfo = getCurrentLine(value, cursorPosition)
    const lines = value.split('\n')
    
    // Replace the current line with the selected suggestion
    lines[lineInfo.lineIndex] = suggestion.address
    
    // Add a new empty line after selection
    lines.push('')
    
    const newValue = lines.join('\n')
    onChange(newValue)
    
    // Close dropdown
    setShowDropdown(false)
    setSuggestions([])
    
    // Don't manipulate cursor position - let the textarea handle it naturally
    // Just focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 0)
  }

  // Handle suggestion selection via click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    handleSuggestionSelect(suggestion)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        setSuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        className={className}
        rows={6}
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto min-w-64"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-50"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {suggestion.address}
                </p>
                {suggestion.type && (
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.type}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && suggestions.length === 0 && !isLoading && currentLine.length >= 2 && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-64"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          <div className="px-3 py-2 text-sm text-gray-500">
            No results found for "{currentLine}"
          </div>
        </div>
      )}

      {isLoading && showDropdown && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-64"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        </div>
      )}
    </div>
  )
}
