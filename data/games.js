// The Hydro store catalogue. This list is the single source of truth:
// on startup the games collection is synced to it (see catalogue.js).
// [title, developer, genre, releaseYear]
module.exports = [
  // RPG
  ['The Witcher 3: Wild Hunt', 'CD Projekt Red', 'RPG', 2015],
  ['Elden Ring', 'FromSoftware', 'RPG', 2022],
  ["Baldur's Gate 3", 'Larian Studios', 'RPG', 2023],
  ['Cyberpunk 2077', 'CD Projekt Red', 'RPG', 2020],
  ['The Elder Scrolls V: Skyrim', 'Bethesda Game Studios', 'RPG', 2011],
  ['Fallout 4', 'Bethesda Game Studios', 'RPG', 2015],
  ['Mass Effect Legendary Edition', 'BioWare', 'RPG', 2021],
  ['Disco Elysium', 'ZA/UM', 'RPG', 2019],
  ['Divinity: Original Sin 2', 'Larian Studios', 'RPG', 2017],
  ['Dark Souls III', 'FromSoftware', 'RPG', 2016],
  ['Persona 5 Royal', 'Atlus', 'RPG', 2020],
  ['Final Fantasy VII Remake Intergrade', 'Square Enix', 'RPG', 2021],

  // Action
  ['Red Dead Redemption 2', 'Rockstar Games', 'Action', 2018],
  ['Grand Theft Auto V', 'Rockstar North', 'Action', 2013],
  ['God of War', 'Santa Monica Studio', 'Action', 2018],
  ['Sekiro: Shadows Die Twice', 'FromSoftware', 'Action', 2019],
  ['Devil May Cry 5', 'Capcom', 'Action', 2019],
  ["Marvel's Spider-Man Remastered", 'Insomniac Games', 'Action', 2022],
  ['Ghost of Tsushima', 'Sucker Punch Productions', 'Action', 2020],
  ['Horizon Zero Dawn', 'Guerrilla Games', 'Action', 2017],
  ['Batman: Arkham Knight', 'Rocksteady Studios', 'Action', 2015],
  ['Monster Hunter: World', 'Capcom', 'Action', 2018],
  ['Metal Gear Solid V: The Phantom Pain', 'Kojima Productions', 'Action', 2015],

  // Adventure
  ['Death Stranding', 'Kojima Productions', 'Adventure', 2019],
  ['The Last of Us Part I', 'Naughty Dog', 'Adventure', 2022],
  ["Uncharted 4: A Thief's End", 'Naughty Dog', 'Adventure', 2016],
  ['Life is Strange', 'Dontnod Entertainment', 'Adventure', 2015],
  ['Firewatch', 'Campo Santo', 'Adventure', 2016],
  ['Outer Wilds', 'Mobius Digital', 'Adventure', 2019],
  ['What Remains of Edith Finch', 'Giant Sparrow', 'Adventure', 2017],
  ['Journey', 'thatgamecompany', 'Adventure', 2012],
  ['It Takes Two', 'Hazelight Studios', 'Adventure', 2021],
  ['A Plague Tale: Innocence', 'Asobo Studio', 'Adventure', 2019],

  // Shooter
  ['Half-Life 2', 'Valve', 'Shooter', 2004],
  ['Half-Life: Alyx', 'Valve', 'Shooter', 2020],
  ['Counter-Strike 2', 'Valve', 'Shooter', 2023],
  ['DOOM Eternal', 'id Software', 'Shooter', 2020],
  ['DOOM', 'id Software', 'Shooter', 2016],
  ['Titanfall 2', 'Respawn Entertainment', 'Shooter', 2016],
  ['BioShock Infinite', 'Irrational Games', 'Shooter', 2013],
  ['Borderlands 2', 'Gearbox Software', 'Shooter', 2012],
  ['Overwatch 2', 'Blizzard Entertainment', 'Shooter', 2022],
  ['Apex Legends', 'Respawn Entertainment', 'Shooter', 2019],
  ['Destiny 2', 'Bungie', 'Shooter', 2017],
  ['Left 4 Dead 2', 'Valve', 'Shooter', 2009],

  // Strategy
  ["Sid Meier's Civilization VI", 'Firaxis Games', 'Strategy', 2016],
  ['XCOM 2', 'Firaxis Games', 'Strategy', 2016],
  ['StarCraft II: Wings of Liberty', 'Blizzard Entertainment', 'Strategy', 2010],
  ['Age of Empires II: Definitive Edition', 'Forgotten Empires', 'Strategy', 2019],
  ['Total War: Warhammer III', 'Creative Assembly', 'Strategy', 2022],
  ['Crusader Kings III', 'Paradox Development Studio', 'Strategy', 2020],
  ['Stellaris', 'Paradox Development Studio', 'Strategy', 2016],
  ['Into the Breach', 'Subset Games', 'Strategy', 2018],
  ['FTL: Faster Than Light', 'Subset Games', 'Strategy', 2012],
  ['Dota 2', 'Valve', 'Strategy', 2013],

  // Simulation
  ['Stardew Valley', 'ConcernedApe', 'Simulation', 2016],
  ['Cities: Skylines', 'Colossal Order', 'Simulation', 2015],
  ['Microsoft Flight Simulator', 'Asobo Studio', 'Simulation', 2020],
  ['The Sims 4', 'Maxis', 'Simulation', 2014],
  ['Euro Truck Simulator 2', 'SCS Software', 'Simulation', 2012],
  ['Planet Coaster', 'Frontier Developments', 'Simulation', 2016],
  ['Factorio', 'Wube Software', 'Simulation', 2020],
  ['RimWorld', 'Ludeon Studios', 'Simulation', 2018],
  ['Kerbal Space Program', 'Squad', 'Simulation', 2015],
  ['PowerWash Simulator', 'FuturLab', 'Simulation', 2022],

  // Survival
  ['Minecraft', 'Mojang Studios', 'Survival', 2011],
  ['Terraria', 'Re-Logic', 'Survival', 2011],
  ['Subnautica', 'Unknown Worlds Entertainment', 'Survival', 2018],
  ['Valheim', 'Iron Gate', 'Survival', 2021],
  ["Don't Starve Together", 'Klei Entertainment', 'Survival', 2016],
  ['Rust', 'Facepunch Studios', 'Survival', 2018],
  ["No Man's Sky", 'Hello Games', 'Survival', 2016],

  // Horror
  ['Resident Evil 4', 'Capcom', 'Horror', 2023],
  ['Resident Evil Village', 'Capcom', 'Horror', 2021],
  ['Dead Space', 'Motive Studio', 'Horror', 2023],
  ['Alien: Isolation', 'Creative Assembly', 'Horror', 2014],
  ['Phasmophobia', 'Kinetic Games', 'Horror', 2020],
  ['Amnesia: The Dark Descent', 'Frictional Games', 'Horror', 2010],

  // Roguelike
  ['Hades', 'Supergiant Games', 'Roguelike', 2020],
  ['Slay the Spire', 'Mega Crit', 'Roguelike', 2019],
  ['The Binding of Isaac: Rebirth', 'Nicalis', 'Roguelike', 2014],
  ['Dead Cells', 'Motion Twin', 'Roguelike', 2018],
  ['Risk of Rain 2', 'Hopoo Games', 'Roguelike', 2020],
  ['Vampire Survivors', 'poncle', 'Roguelike', 2022],

  // Platformer
  ['Hollow Knight', 'Team Cherry', 'Platformer', 2017],
  ['Celeste', 'Maddy Makes Games', 'Platformer', 2018],
  ['Cuphead', 'Studio MDHR', 'Platformer', 2017],
  ['Ori and the Will of the Wisps', 'Moon Studios', 'Platformer', 2020],
  ['Limbo', 'Playdead', 'Platformer', 2010],
  ['Inside', 'Playdead', 'Platformer', 2016],

  // Puzzle
  ['Portal 2', 'Valve', 'Puzzle', 2011],
  ['Portal', 'Valve', 'Puzzle', 2007],
  ['Return of the Obra Dinn', 'Lucas Pope', 'Puzzle', 2018],
  ['The Witness', 'Thekla', 'Puzzle', 2016],
  ['Baba Is You', 'Hempuli', 'Puzzle', 2019],

  // Racing & sports
  ['Forza Horizon 5', 'Playground Games', 'Racing', 2021],
  ['Assetto Corsa', 'Kunos Simulazioni', 'Racing', 2014],
  ['Rocket League', 'Psyonix', 'Sports', 2015],

  // Fighting
  ['Street Fighter 6', 'Capcom', 'Fighting', 2023],
  ['Tekken 8', 'Bandai Namco', 'Fighting', 2024],
].map(([title, developer, genre, releaseYear]) => ({ title, developer, genre, releaseYear }));
