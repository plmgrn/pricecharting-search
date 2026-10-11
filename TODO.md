# Things to do

## Bug fixes

Identified bugs

- [ ] Fix hotbar search functioning 
    - [x] Fix bug with filters being used as the query (should never happen)
    - [x] Fix console aliases list with consoleuid (vita marked as G43 when it is G101 tms.)
    - [ ] Ensure this works with long term monitoring
- [ ] Logic behind regions and searches should be revised
    - [ ] Add option to disable region specifying when searching highlighted text

## Performance

These thing should improve the performance, both in terms of running and UX


### Try not to get caught by antibot cloudflare checks
- [ ] Add cooldowns and debounce between searches
- [ ] Add option to reuse existing pricecharting tab
- [ ] Recheck URL construction to not flag any URL formatting checks pricecharting-side


## Improvement

- [ ] Add a reminder for search query syntax (e.g. how the 'keyword : query' structure works)
    - [ ] An 'i' button or equiv in the search box
    - [ ] Alternatively make default placeholder text in the box remind of the query syntax
        - [ ] Setting to disable this
