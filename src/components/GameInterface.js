import React, { useState, useEffect, useRef } from "react";
import gameData from "../data/game_data.json";
import "./GameInterface.css";

function GameInterface() {
  const [gameLog, setGameLog] = useState([]);
  const [input, setInput] = useState("");
  const [gameState, setGameState] = useState({
    currentRoom: "west of house",
    inventory: [],
    itemsInWorld: gameData.state.itemsInWorld,
    containerContents: gameData.state.containerContents,
    roomStates: {},
    trophyItems: gameData.state.trophyItems
  });
  const logRef = useRef(null);

  // Add state for game settings and last command
  const [gameSettings, setGameSettings] = useState({
    verbose: false,
    brief: true,
    superbrief: false,
    score: 0,
    health: 100,
    lastCommand: ""
  });

  // Add helper functions to get room descriptions
  const getBasicRoomDescription = (roomId) => {
    const room = gameData.rooms[roomId];
    const roomStates = gameState.roomStates?.[roomId] || {};
    
    // Special handling for cellar when lamp is lit/unlit
    if (roomId === "cellar") {
      const isLampLit = roomStates.lampLit;
      console.log('Lamp state:', isLampLit); // Debug log
      return isLampLit ? room.litDescription : room.description;
    }
    
    return room.description;
  };

  const getRoomDescriptionWithItems = (roomId) => {
    const room = gameData.rooms[roomId];
    const roomStates = gameState.roomStates?.[roomId] || {};
    
    // Filter items based on room conditions
    const roomItems = Object.entries(gameState.itemsInWorld)
      .filter(([item, location]) => {
        if (location !== roomId) return false;
        
        // Special case for pot of gold - only visible when rainbow is solid
        if (item === "pot of gold" && roomId === "canyon bottom") {
          return roomStates.rainbowSolid === true;
        }
        
        return true;
      })
      .map(([item]) => item);

    // Get items in basket if we're in shaft room
    const basketContents = roomId === "shaft room" ? 
      gameState.containerContents?.basket || [] : [];

    // Get the base description based on lamp state for cellar
    let description;
    if (roomId === "cellar") {
      const isLampLit = roomStates.lampLit;
      description = isLampLit ? room.litDescription : room.description;
    } else {
      description = room.description;
    }
    
    // Modify description based on rainbow state
    if (roomId === "canyon bottom" && roomStates.rainbowSolid) {
      description = description.replace(
        "A rainbow arcs across the chasm, its colors shimmering in the sunlight.",
        "A solid rainbow bridge spans the chasm, its colors shimmering in the sunlight."
      );
    }
    
    // Add room items
    if (roomItems.length > 0) {
      description += "\n\nYou can see: " + roomItems.join(", ") + " here.";
    }

    // Add basket contents if any
    if (basketContents.length > 0) {
      description += "\n\nThe basket contains: " + basketContents.join(", ") + ".";
    }

    return description;
  };

  useEffect(() => {
    const initialRoom = gameData.rooms[gameState.currentRoom];
    setGameLog([
      "ZORK I: The Great Underground Empire",
      "Copyright (c) 1981, 1982, 1983 Infocom, Inc.",
      "All rights reserved.",
      "",
      getBasicRoomDescription(gameState.currentRoom)
    ]);
  }, [gameState.currentRoom]);

  useEffect(() => {
    // Scroll to bottom when log updates
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  const handleInput = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const command = input.trim().toLowerCase();

    if (command) {
      setGameSettings(prev => ({
        ...prev,
        lastCommand: command
      }));
      processCommand(command);
      setInput("");
    }
  };

  const processCommand = (command) => {
    // Handle empty command
    if (!command) {
      setGameLog((prevLog) => [
        ...prevLog,
        ">",
        "I beg your pardon?"
      ]);
      return;
    }

    // Secret cheat command
    if (command.toLowerCase() === "show me the money") {
      const allItems = Object.keys(gameData.state.itemsInWorld);
      setGameState(prevState => ({
        ...prevState,
        inventory: allItems
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        "> show me the money",
        "Cheat activated! All items added to inventory.",
        "You are now carrying: " + allItems.join(", ")
      ]);
      return;
    }

    // Split the command into words
    const words = command.toLowerCase().split(" ");
    const action = words[0];
    const target = words.slice(1).join(" ");

    // Handle directional shortcuts
    const directionMap = {
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'ne': 'northeast',
      'nw': 'northwest',
      'se': 'southeast',
      'sw': 'southwest',
      'u': 'up',
      'd': 'down'
    };

    // Handle movement commands
    if (Object.keys(directionMap).includes(action) || 
        Object.values(directionMap).includes(action)) {
      const direction = directionMap[action] || action;
      handleGo(direction);
      return;
    }

    // Handle special commands
    switch (action) {
      case "go":
        handleGo(target);
        break;
      case "take":
        if (target.includes(" from ")) {
          const [item, _, container] = target.split(" from ");
          handleTakeFrom(item, container);
        } else if (target === "all") {
          handleTakeAll();
        } else {
          handleTake(target);
        }
        break;
      case "drop":
        handleDrop(target);
        break;
      case "inventory":
      case "i":
        handleInventory();
        break;
      case "look":
      case "l":
        handleLook();
        break;
      case "examine":
      case "x":
        handleExamine(target);
        break;
      case "read":
        handleRead(target);
        break;
      case "turn":
        if (target.includes(" with ")) {
          const [item, tool] = target.split(" with ");
          if (item === "bolt" && tool === "wrench" && gameState.currentRoom === "dam") {
            if (!gameState.inventory.includes("wrench")) {
              setGameLog((prevLog) => [
                ...prevLog,
                `> turn bolt with wrench`,
                "You don't have the wrench."
              ]);
              return;
            }
            setGameState(prevState => ({
              ...prevState,
              roomStates: {
                ...prevState.roomStates,
                dam: {
                  ...prevState.roomStates?.dam,
                  gates: prevState.roomStates?.dam?.gates === "open" ? "closed" : "open"
                }
              }
            }));
            const newState = gameState.roomStates?.dam?.gates === "open" ? "closed" : "open";
            setGameLog((prevLog) => [
              ...prevLog,
              `> turn bolt with wrench`,
              `The bolt turns with the wrench, and you hear rushing water. The gates are now ${newState}.`
            ]);
          } else {
            setGameLog((prevLog) => [
              ...prevLog,
              `> turn ${target}`,
              "That wouldn't achieve anything."
            ]);
          }
        } else if (target === "on lamp" || target === "lamp on") {
          if (!gameState.inventory.includes("lamp")) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> turn on lamp`,
              "You don't have the lamp."
            ]);
            return;
          }

          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              [gameState.currentRoom]: {
                ...prevState.roomStates?.[gameState.currentRoom],
                lampLit: true
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> turn on lamp`,
            "The brass lamp is now on.",
            getRoomDescriptionWithItems(gameState.currentRoom)
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> turn ${target}`,
            "Turn it with what?"
          ]);
        }
        break;
      case "light":
        if (target === "lamp" && gameState.inventory.includes("lamp")) {
          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              [gameState.currentRoom]: {
                ...prevState.roomStates?.[gameState.currentRoom],
                lampLit: true
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> light lamp`,
            "The brass lamp is now on.",
            getRoomDescriptionWithItems(gameState.currentRoom)
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> light ${target}`,
            "You can't light that."
          ]);
        }
        break;
      case "climb":
        handleClimb(target);
        break;
      case "open":
        if (target === "case" || target === "trophy case") {
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            "The trophy case is already open."
          ]);
        } else if (target === "coffin") {
          // Check if coffin is in inventory OR in current room
          const coffinInRoom = gameState.itemsInWorld["coffin"] === gameState.currentRoom;
          if (!gameState.inventory.includes("coffin") && !coffinInRoom) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> open ${target}`,
              "You don't see any coffin here."
            ]);
            return;
          }

          // Initialize the coffin contents if they don't exist
          const currentContents = gameState.containerContents?.coffin || [];
          const newContents = currentContents.length === 0 ? ["sceptre"] : currentContents;

          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              coffin: { 
                ...prevState.roomStates?.coffin,
                isOpen: true 
              }
            },
            containerContents: {
              ...prevState.containerContents,
              coffin: newContents
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            "The coffin creaks open, revealing a sceptre inside!"
          ]);
        } else if (target === "sack") {
          // Check if sack is in inventory OR in current room
          const sackInRoom = gameState.itemsInWorld["sack"] === gameState.currentRoom;
          if (!gameState.inventory.includes("sack") && !sackInRoom) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> open ${target}`,
              "You don't see any sack here."
            ]);
            return;
          }

          // Initialize the sack contents if they don't exist
          const currentContents = gameState.containerContents?.sack || [];
          const newContents = currentContents.length === 0 ? ["garlic", "water"] : currentContents;

          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              sack: { 
                ...prevState.roomStates?.sack,
                isOpen: true 
              }
            },
            containerContents: {
              ...prevState.containerContents,
              sack: newContents
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            "Opening the sack reveals garlic and a quantity of water!"
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> open ${target}`,
            "You can't open that."
          ]);
        }
        break;
      case "close":
        handleClose(target);
        break;
      case "enter":
      case "in":
        if (gameState.currentRoom === "east of house") {
          setGameState((prevState) => ({
            ...prevState,
            currentRoom: "kitchen"
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${command}`,
            getBasicRoomDescription("kitchen")
          ]);
        } else {
          handleEnter(target);
        }
        break;
      case "out":
        handleOut();
        break;
      case "move":
        handleMove(target);
        break;
      case "put":
        if (target.includes(" in ")) {
          const [item, container] = target.split(" in ");
          if (container === "case" || container === "trophy case") {
            if (!gameState.inventory.includes(item)) {
              setGameLog((prevLog) => [
                ...prevLog,
                `> put ${item} in case`,
                `You don't have the ${item}.`
              ]);
            } else if (gameData.state.trophyItems.includes(item)) {
              setGameState(prevState => ({
                ...prevState,
                inventory: prevState.inventory.filter(i => i !== item),
                itemsInWorld: { ...prevState.itemsInWorld, [item]: "trophy case" }
              }));
              setGameLog((prevLog) => [
                ...prevLog,
                `> put ${item} in case`,
                `You put the ${item} in the trophy case.`
              ]);
            } else {
              setGameLog((prevLog) => [
                ...prevLog,
                `> put ${item} in case`,
                `The ${item} isn't valuable enough to go in the trophy case.`
              ]);
            }
          } else if (container === "basket") {
            if (!gameState.inventory.includes(item)) {
              setGameLog((prevLog) => [
                ...prevLog,
                `> put ${item} in basket`,
                `You don't have the ${item}.`
              ]);
            } else {
              setGameState(prevState => ({
                ...prevState,
                inventory: prevState.inventory.filter(i => i !== item),
                containerContents: {
                  ...prevState.containerContents,
                  basket: [...(prevState.containerContents?.basket || []), item]
                }
              }));
              setGameLog((prevLog) => [
                ...prevLog,
                `> put ${item} in basket`,
                `You put the ${item} in the basket.`
              ]);
            }
          } else {
            setGameLog((prevLog) => [
              ...prevLog,
              `> put ${item} in ${container}`,
              "You can't put anything in that."
            ]);
          }
        }
        break;
      case "squeeze":
        handleSqueeze(target);
        break;
      case "slide":
        handleSlide();
        break;
      case "inflate":
        handleInflate(target);
        break;
      case "board":
        handleBoard(target);
        break;
      case "launch":
        handleLaunch();
        break;
      case "wait":
        handleWait();
        break;
      case "dig":
        handleDig();
        break;
      case "cross":
        handleCross(target);
        break;
      case "touch":
        handleTouch(target);
        break;
      case "wind":
        handleWind(target);
        break;
      case "give":
        const [giveItem, toWord, giveTarget] = target.split(" to ");
        handleGive(giveItem, giveTarget);
        break;
      case "attack":
      case "kill":
        if (target.includes(" with ")) {
          const [creature, weapon] = target.split(" with ");
          handleAttack(creature.trim(), weapon.trim());
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action} ${target}`,
            "What do you want to kill it with?"
          ]);
        }
        break;
      case "ulysses":
      case "odysseus":
        if (gameState.currentRoom === "cyclops room") {
          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              "cyclops room": { 
                ...prevState.roomStates?.["cyclops room"],
                cyclopsFled: true 
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action}`,
            "At the sound of his ancient enemy's name, the cyclops flees in terror, smashing through the wall to the living room!"
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action}`,
            "Nothing happens."
          ]);
        }
        break;
      case "echo":
        if (gameState.currentRoom === "loud room") {
          setGameLog((prevLog) => [
            ...prevLog,
            "> echo",
            "The acoustics of the room cause your voice to echo and reverberate. As the sound dies away, you notice a platinum bar has appeared!"
          ]);
          setGameState(prevState => ({
            ...prevState,
            itemsInWorld: {
              ...prevState.itemsInWorld,
              "platinum bar": "loud room"
            }
          }));
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            "> echo",
            "Your voice echoes slightly."
          ]);
        }
        break;
      case "help":
      case "?":
        handleHelp();
        break;
      case "restart":
        handleRestart();
        break;
      case "save":
        handleSave();
        break;
      case "restore":
      case "load":
        handleLoad();
        break;
      case "tie":
        if (target.includes(" to ")) {
          const [item, destination] = target.split(" to ");
          if (item === "rope" && destination === "railing" && 
              gameState.currentRoom === "dome room" && 
              gameState.inventory.includes("rope")) {
            setGameState(prevState => ({
              ...prevState,
              inventory: prevState.inventory.filter(i => i !== "rope"),
              roomStates: {
                ...prevState.roomStates,
                "dome room": {
                  ...prevState.roomStates?.["dome room"],
                  ropeTied: true
                }
              }
            }));
            setGameLog((prevLog) => [
              ...prevLog,
              `> tie rope to railing`,
              "The rope is now securely tied to the railing."
            ]);
          } else {
            setGameLog((prevLog) => [
              ...prevLog,
              `> tie ${item} to ${destination}`,
              "You can't tie that."
            ]);
          }
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> tie ${target}`,
            "What do you want to tie it to?"
          ]);
        }
        break;
      case "rub":
        if (target === "mirror" && gameState.currentRoom === "mirror room 2") {
          const candlesOut = gameState.roomStates?.["mirror room 2"]?.candlesOut;
          
          if (!candlesOut) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> rub mirror`,
              "The light from the candles is too bright. You need to extinguish them first."
            ]);
            return;
          }

          setGameState(prevState => ({
            ...prevState,
            currentRoom: "mirror room 1"
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> rub mirror`,
            "As you rub the mirror in the darkness, your surroundings shimmer and shift. You find yourself in a different mirror room!"
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> rub ${target}`,
            "Rubbing that has no effect."
          ]);
        }
        break;
      case "unlock":
        handleUnlock(target);
        break;
      case "pray":
        handlePray();
        break;
      case "wave":
        if (target === "sceptre" || target === "scepter") {
          if (!gameState.inventory.includes("sceptre")) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> wave ${target}`,
              "You don't have the sceptre."
            ]);
            return;
          }

          if (gameState.currentRoom === "canyon bottom") {
            setGameState(prevState => ({
              ...prevState,
              roomStates: {
                ...prevState.roomStates,
                "canyon bottom": {
                  ...prevState.roomStates?.["canyon bottom"],
                  rainbowSolid: true
                }
              }
            }));
            setGameLog((prevLog) => [
              ...prevLog,
              `> wave ${target}`,
              "As you wave the sceptre, the rainbow seems to become solid, forming a beautiful bridge across the canyon!"
            ]);
          } else {
            setGameLog((prevLog) => [
              ...prevLog,
              `> wave ${target}`,
              "Nothing happens."
            ]);
          }
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> wave ${target}`,
            "You wave it around, but nothing happens."
          ]);
        }
        break;
      case "push":
        if (target === "yellow button" && gameState.currentRoom === "maintenance room") {
          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              dam: {
                ...prevState.roomStates?.dam,
                gates: "closed"
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> push yellow button`,
            "Click.",
            "The gates close and water starts to collect behind the dam."
          ]);
        } else if (target === "brown button" && gameState.currentRoom === "maintenance room") {
          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              dam: {
                ...prevState.roomStates?.dam,
                gates: "open"
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> push brown button`,
            "Click.",
            "The gates open and water pours through the dam."
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> push ${target}`,
            "Nothing happens."
          ]);
        }
        break;
      case "extinguish":
      case "douse":
      case "put":
        if ((target === "candles" || target === "out candles") && gameState.currentRoom === "mirror room 2") {
          if (!gameState.inventory.includes("candles")) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> ${action} ${target}`,
              "You don't have the candles."
            ]);
            return;
          }

          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              "mirror room 2": {
                ...prevState.roomStates?.["mirror room 2"],
                candlesOut: true
              }
            }
          }));
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action} ${target}`,
            "You extinguish the candles. The room becomes noticeably darker."
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${action} ${target}`,
            "You can't extinguish that."
          ]);
        }
        break;
      default:
        // Check for profanity
        if (/^(damn|shit|fuck|crap|hell)$/i.test(action)) {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${command}`,
            "Such language in a high-class establishment like this!"
          ]);
        } else {
          setGameLog((prevLog) => [
            ...prevLog,
            `> ${command}`,
            "I don't understand that command."
          ]);
        }
        break;
    }
  };

  const handleGo = (direction) => {
    const room = gameData.rooms[gameState.currentRoom];
    const action = room.actions[`go ${direction}`] || room.actions[direction];

    if (!action) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> go ${direction}`,
        "You can't go that way."
      ]);
      return;
    }

    // Handle action objects with requirements
    if (typeof action === 'object') {
      // Check if all required items/states are met
      if (action.requires) {
        const requirements = Array.isArray(action.requires) ? action.requires : [action.requires];
        const meetsRequirements = requirements.every(req => {
          if (gameState.inventory.includes(req)) return true;
          if (gameState.roomStates?.[gameState.currentRoom]?.[req]) return true;
          return false;
        });

        if (!meetsRequirements) {
          setGameLog((prevLog) => [
            ...prevLog,
            `> go ${direction}`,
            action.failMessage || "You can't go that way."
          ]);
          return;
        }

        // If requirements met, handle destination and message
        setGameState(prevState => ({
          ...prevState,
          currentRoom: action.destination
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> go ${direction}`,
          action.message || `You move ${direction}.`,
          getBasicRoomDescription(action.destination)
        ]);
        return;
      }
    }

    // Handle simple string destinations
    setGameState(prevState => ({
      ...prevState,
      currentRoom: typeof action === 'string' ? action : action.destination
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      `> go ${direction}`,
      `You move ${direction}.`,
      getBasicRoomDescription(typeof action === 'string' ? action : action.destination)
    ]);
  };

  const handleClimb = (direction) => {
    const room = gameData.rooms[gameState.currentRoom];
    const action = room.actions[`climb ${direction}`];

    if (!action) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> climb ${direction}`,
        "You can't climb that."
      ]);
      return;
    }

    // Handle action objects with requirements
    if (typeof action === 'object') {
      if (action.requires) {
        const requirements = Array.isArray(action.requires) ? action.requires : [action.requires];
        const meetsRequirements = requirements.every(req => {
          if (gameState.inventory.includes(req)) return true;
          if (gameState.roomStates?.[gameState.currentRoom]?.[req]) return true;
          return false;
        });

        if (!meetsRequirements) {
          setGameLog((prevLog) => [
            ...prevLog,
            `> climb ${direction}`,
            action.failMessage || "You can't climb that way."
          ]);
          return;
        }

        setGameState(prevState => ({
          ...prevState,
          currentRoom: action.destination
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> climb ${direction}`,
          action.message || `You climb ${direction}.`,
          getBasicRoomDescription(action.destination)
        ]);
        return;
      }
    }
  };

  const handleTake = (item) => {
    // Check if the item exists in the current room
    const itemLocation = gameState.itemsInWorld[item];
    
    // Check if item is in an open container in the room
    const coffin = gameState.roomStates?.coffin || {};
    const coffinContents = gameState.containerContents?.coffin || [];
    const isInOpenCoffin = coffin.isOpen && 
                          coffinContents.includes(item) &&
                          (gameState.itemsInWorld["coffin"] === gameState.currentRoom || 
                           gameState.inventory.includes("coffin"));

    // Check if item is in an open sack
    const sack = gameState.roomStates?.sack || {};
    const sackContents = gameState.containerContents?.sack || [];
    const isInOpenSack = sack.isOpen && 
                        sackContents.includes(item) &&
                        (gameState.itemsInWorld["sack"] === gameState.currentRoom || 
                         gameState.inventory.includes("sack"));

    if (itemLocation === gameState.currentRoom) {
      // Add item to inventory and remove from room
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        itemsInWorld: { ...prevState.itemsInWorld, [item]: null }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `Taken.`
      ]);
    } else if (isInOpenCoffin) {
      // Take item from coffin
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        containerContents: {
          ...prevState.containerContents,
          coffin: (prevState.containerContents?.coffin || []).filter(i => i !== item)
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `Taken.`
      ]);
    } else if (isInOpenSack) {
      // Take item from sack
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        containerContents: {
          ...prevState.containerContents,
          sack: (prevState.containerContents?.sack || []).filter(i => i !== item)
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `Taken.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> take ${item}`,
        `You don't see that here.`
      ]);
    }
  };

  const handleUse = (item) => {
    if (gameState.inventory.includes(item)) {
      const currentRoom = gameData.rooms[gameState.currentRoom];
      const useAction = currentRoom.actions[`use ${item}`];

      if (useAction) {
        setGameLog((prevLog) => [...prevLog, `> use ${item}`, useAction]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> use ${item}`,
          `You can't use the ${item} here.`
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> use ${item}`,
        `You don't have a ${item}.`
      ]);
    }
  };

  const handleInventory = () => {
    if (gameState.inventory.length > 0) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> inventory",
        `You are carrying: ${gameState.inventory.join(", ")}`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> inventory",
        "Your inventory is empty."
      ]);
    }
  };

  const handleLook = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> look",
      getRoomDescriptionWithItems(gameState.currentRoom)
    ]);
  };

  const handleUnlock = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const unlockAction = currentRoom.actions[`unlock ${target}`];

    // Check if the grating is revealed before allowing unlock
    if (target === "grating" && !gameState.roomStates?.["grating clearing"]?.gratingRevealed) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> unlock ${target}`,
        `You don't see any grating here.`
      ]);
      return;
    }

    if (!unlockAction) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> unlock ${target}`,
        `You can't unlock that.`
      ]);
      return;
    }

    // Check if we have the required items
    if (unlockAction.requires) {
      const missingItems = unlockAction.requires.filter(item => !gameState.inventory.includes(item));
      if (missingItems.length > 0) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> unlock ${target}`,
          `You need a ${missingItems[0]} to unlock that.`
        ]);
        return;
      }
    }

    // Apply the unlock action
    setGameState(prevState => ({
      ...prevState,
      roomStates: {
        ...prevState.roomStates,
        "grating clearing": {
          ...(prevState.roomStates?.["grating clearing"] || {}),
          gratingUnlocked: true
        }
      }
    }));

    setGameLog((prevLog) => [
      ...prevLog,
      `> unlock ${target}`,
      unlockAction.message
    ]);
  };

  const handleDrop = (item) => {
    if (gameState.inventory.includes(item)) {
      setGameState((prevState) => ({
        ...prevState,
        inventory: prevState.inventory.filter((invItem) => invItem !== item),
        itemsInWorld: { ...prevState.itemsInWorld, [item]: gameState.currentRoom }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> drop ${item}`,
        `You have dropped the ${item}.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> drop ${item}`,
        `You don't have a ${item}.`
      ]);
    }
  };

  const handleExamine = (item) => {
    if (gameState.inventory.includes(item) || gameState.itemsInWorld[item] === gameState.currentRoom) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> examine ${item}`,
        `The ${item} looks interesting, but there's nothing unusual.`
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> examine ${item}`,
        `You can't see a ${item} here.`
      ]);
    }
  };

  const handleRead = (object) => {
    if (gameState.inventory.includes(object) || gameState.itemsInWorld[object] === gameState.currentRoom) {
      const description = gameData.state.itemDescriptions[object];
      if (description) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> read ${object}`,
          description
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> read ${object}`,
          `There's nothing written on the ${object}.`
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> read ${object}`,
        `You don't have the ${object}.`
      ]);
    }
  };

  const handleEnter = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const enterAction = currentRoom.actions["enter"];
    
    if (enterAction && gameData.rooms[enterAction]) {
      setGameState((prevState) => ({
        ...prevState,
        currentRoom: enterAction
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> enter ${target}`,
        getBasicRoomDescription(enterAction)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> enter ${target}`,
        `You can't enter that.`
      ]);
    }
  };

  const handleSave = () => {
    try {
      const saveState = {
        gameState,
        gameSettings
      };
      localStorage.setItem('zorkSaveGame', JSON.stringify(saveState));
      setGameLog((prevLog) => [
        ...prevLog,
        "> save",
        "Game saved."
      ]);
    } catch (error) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> save",
        "Failed to save game."
      ]);
    }
  };

  const handleLoad = () => {
    try {
      const savedGame = localStorage.getItem('zorkSaveGame');
      if (savedGame) {
        const loadedState = JSON.parse(savedGame);
        setGameState(loadedState.gameState);
        setGameSettings(loadedState.gameSettings);
        setGameLog((prevLog) => [
          ...prevLog,
          "> load",
          "Game loaded.",
          "",
          getBasicRoomDescription(loadedState.gameState.currentRoom)
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          "> load",
          "No saved game found."
        ]);
      }
    } catch (error) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> load",
        "Failed to load game."
      ]);
    }
  };

  const handleRestart = () => {
    setGameState({
      currentRoom: "west of house",
      inventory: [],
      itemsInWorld: gameData.state.itemsInWorld,
      containerContents: gameData.state.containerContents,
      roomStates: {},
      trophyItems: gameData.state.trophyItems
    });
    setGameSettings(prev => ({
      ...prev,
      score: 0,
      lastCommand: ""
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> restart",
      "Game restarted.",
      "",
      "ZORK I: The Great Underground Empire",
      "Copyright (c) 1981, 1982, 1983 Infocom, Inc.",
      "All rights reserved.",
      "",
      getBasicRoomDescription("west of house")
    ]);
  };

  const handleHelp = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> help",
      "Available commands:",
      "- look (l): Look around the current room",
      "- go [direction]: Move in a direction (north, south, east, west, up, down)",
      "- north (n), south (s), east (e), west (w), up (u), down (d): Move in that direction",
      "- take/get [item]: Pick up an item",
      "- drop [item]: Drop an item from your inventory",
      "- move [item]: Move an item to reveal what's underneath",
      "- inventory (i): Check your inventory",
      "- examine (x) [item]: Look at an item closely",
      "- open [object]: Open something",
      "- enter [object]: Enter something",
      "- save: Save your current game",
      "- load/restore: Load your saved game",
      "- restart: Start a new game",
      "- help: Show this help message"
    ]);
  };

  const handleMove = (item) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const moveAction = currentRoom.actions[`move ${item}`];
    
    if (moveAction) {
      // If it's the rug, update the room description to show the trapdoor
      if (item === "rug" && gameState.currentRoom === "living room") {
        setGameState(prevState => ({
          ...prevState,
          rugMoved: true
        }));
      }
      // If it's the leaves, update the room state to show the grating
      else if (item === "leaves" && gameState.currentRoom === "grating clearing") {
        setGameState(prevState => ({
          ...prevState,
          roomStates: {
            ...prevState.roomStates,
            "grating clearing": {
              ...prevState.roomStates?.["grating clearing"],
              gratingRevealed: true
            }
          }
        }));
      }
      
      setGameLog((prevLog) => [
        ...prevLog,
        `> move ${item}`,
        typeof moveAction === 'string' ? moveAction : moveAction.message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> move ${item}`,
        `You can't move that.`
      ]);
    }
  };

  // Add new handler functions
  const handleTakeAll = () => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const roomItems = Object.entries(gameState.itemsInWorld)
      .filter(([item, location]) => location === gameState.currentRoom)
      .map(([item]) => item);

    if (roomItems.length === 0) {
      setGameLog((prevLog) => [
        ...prevLog,
        "> take all",
        "There is nothing here to take."
      ]);
      return;
    }

    const takenItems = [];
    roomItems.forEach(item => {
      setGameState((prevState) => ({
        ...prevState,
        inventory: [...prevState.inventory, item],
        itemsInWorld: { ...prevState.itemsInWorld, [item]: null }
      }));
      takenItems.push(item);
    });

    setGameLog((prevLog) => [
      ...prevLog,
      "> take all",
      `Taken: ${takenItems.join(", ")}`
    ]);
  };

  const handlePut = (item, container) => {
    // Handle special cases for items with spaces
    if (item === "pot" && container === "gold") {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in ${container}`,
        "Did you mean 'put pot of gold in case'?"
      ]);
      return;
    }

    // Convert "pot of gold" variations to the full item name
    const fullItemName = item === "pot" || item === "gold" ? "pot of gold" : item;

    if (!gameState.inventory?.includes(fullItemName)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in ${container}`,
        `You don't have the ${fullItemName}.`
      ]);
      return;
    }

    if (container === "case") {
      // Check if the item is in the trophy items list
      const isTrophy = gameState.trophyItems?.includes(fullItemName);
      
      if (isTrophy) {
        setGameState(prevState => ({
          ...prevState,
          inventory: prevState.inventory.filter(i => i !== fullItemName),
          containerContents: {
            ...prevState.containerContents,
            case: [...(prevState.containerContents?.case || []), fullItemName]
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> put ${item} in ${container}`,
          `You put the ${fullItemName} in the trophy case.`
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> put ${item} in ${container}`,
          `The ${fullItemName} isn't a treasure.`
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in ${container}`,
        `You can't put anything in the ${container}.`
      ]);
    }
  };

  const handleOut = () => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    if (currentRoom.actions["exit"]) {
      handleEnter("exit");
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> out",
        "You can't go out here."
      ]);
    }
  };

  const handleClose = (target) => {
    if (target === "lid" && gameState.currentRoom === "machine room") {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "machine room": {
            ...prevState.roomStates?.["machine room"],
            lidOpen: false
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> close ${target}`,
        "You close the machine's lid."
      ]);
      return;
    }
    setGameLog((prevLog) => [
      ...prevLog,
      `> close ${target}`,
      `You can't close that.`
    ]);
  };

  const handleScore = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> score",
      `Your score is ${gameSettings.score} points in ${gameState.inventory.length} moves.`,
      "This gives you the rank of Beginner."
    ]);
  };

  const handleDiagnose = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> diagnose",
      "You are in perfect health.",
      "You are wide awake.",
      "You are not hungry."
    ]);
  };

  const handleVerbose = () => {
    setGameSettings(prev => ({
      ...prev,
      verbose: true,
      brief: false,
      superbrief: false
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> verbose",
      "Maximum verbosity."
    ]);
  };

  const handleBrief = () => {
    setGameSettings(prev => ({
      ...prev,
      verbose: false,
      brief: true,
      superbrief: false
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> brief",
      "Brief descriptions."
    ]);
  };

  const handleSuperbrief = () => {
    setGameSettings(prev => ({
      ...prev,
      verbose: false,
      brief: false,
      superbrief: true
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      "> superbrief",
      "Superbrief descriptions."
    ]);
  };

  const handleQuit = () => {
    setGameLog((prevLog) => [
      ...prevLog,
      "> quit",
      "Thanks for playing! Refresh the page to start a new game."
    ]);
  };

  const handleRepeatLastCommand = () => {
    if (gameSettings.lastCommand) {
      processCommand(gameSettings.lastCommand);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> g",
        "No command to repeat."
      ]);
    }
  };

  const handleAttack = (creature, weapon) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (creature === "troll" && gameState.currentRoom === "troll room") {
      if (weapon === "sword" && gameState.inventory.includes("sword")) {
        setGameState(prevState => ({
          ...prevState,
          roomStates: {
            ...prevState.roomStates,
            "troll room": { trollDefeated: true }
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> attack troll with sword`,
          "The troll, disarmed by your skilled swordplay, takes flight. The troll, defeated, disappears into the gloom."
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> attack troll with ${weapon}`,
          "The troll laughs at your puny attempt to attack him."
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> attack ${creature} with ${weapon}`,
        "There is nothing here to attack."
      ]);
    }
  };

  const handleThrow = (item, target) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> throw ${item} at ${target}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (item === "garlic" && target === "troll" && gameState.currentRoom === "troll room") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== "garlic"),
        roomStates: {
          ...prevState.roomStates,
          "troll room": { trollDefeated: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> throw garlic at troll`,
        "The troll catches the garlic and runs away in disgust. The troll, defeated, disappears into the gloom."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> throw ${item} at ${target}`,
        `Throwing the ${item} doesn't accomplish anything.`
      ]);
    }
  };

  const handleTie = (item, target) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> tie ${item} to ${target}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    const currentRoom = gameData.rooms[gameState.currentRoom];
    if (currentRoom.actions[`tie ${item} to ${target}`]) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "dome room": { ropeAttached: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> tie ${item} to ${target}`,
        currentRoom.actions[`tie ${item} to ${target}`]
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> tie ${item} to ${target}`,
        `You can't tie the ${item} to that.`
      ]);
    }
  };

  const handleWave = (item) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> wave ${item}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    const currentRoom = gameData.rooms[gameState.currentRoom];
    const waveAction = currentRoom.actions[`wave ${item}`];
    
    if (waveAction) {
      if (gameState.currentRoom === "canyon bottom" && item === "sceptre") {
        setGameState(prevState => ({
          ...prevState,
          roomStates: {
            ...prevState.roomStates,
            "canyon bottom": { 
              ...prevState.roomStates?.["canyon bottom"],
              rainbowSolid: true,
              potRevealed: true 
            }
          },
          itemsInWorld: {
            ...prevState.itemsInWorld,
            "pot of gold": "canyon bottom"
          }
        }));
      }
      setGameLog((prevLog) => [
        ...prevLog,
        `> wave ${item}`,
        waveAction.message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> wave ${item}`,
        `Waving the ${item} accomplishes nothing.`
      ]);
    }
  };

  const handlePush = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const pushAction = currentRoom.actions[`push ${target}`];
    
    if (pushAction) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> push ${target}`,
        pushAction
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> push ${target}`,
        `You can't push that.`
      ]);
    }
  };

  const handleTurn = (item, tool) => {
    if (!gameState.inventory.includes(tool)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn ${item} with ${tool}`,
        `You don't have the ${tool}.`
      ]);
      return;
    }

    const currentRoom = gameData.rooms[gameState.currentRoom];
    const turnAction = currentRoom.actions[`turn ${item} with ${tool}`];

    if (turnAction) {
      if (gameState.currentRoom === "dam" && item === "bolt" && tool === "wrench") {
        setGameState(prevState => ({
          ...prevState,
          roomStates: {
            ...prevState.roomStates,
            dam: { damOpened: true }
          }
        }));
      }
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn ${item} with ${tool}`,
        turnAction.message || turnAction
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn ${item} with ${tool}`,
        `You can't turn that.`
      ]);
    }
  };

  const handleLight = (item, source) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (item === "candles" && source === "match" && 
        gameState.inventory.includes("candles") && 
        gameState.inventory.includes("matches")) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "entrance to hades": { 
            ...prevState.roomStates?.["entrance to hades"],
            candlesLit: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> light ${item} with ${source}`,
        "The candles are now lit, casting an eerie glow."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> light ${item} with ${source}`,
        `You can't light that.`
      ]);
    }
  };

  const handleRing = (item) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (item === "bell" && gameState.currentRoom === "entrance to hades") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== "bell" && i !== "candles"),
        itemsInWorld: {
          ...prevState.itemsInWorld,
          bell: gameState.currentRoom,
          candles: gameState.currentRoom
        },
        roomStates: {
          ...prevState.roomStates,
          "entrance to hades": { 
            ...prevState.roomStates?.["entrance to hades"],
            bellRung: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> ring ${item}`,
        "The bell suddenly becomes red hot! You drop it, along with the candles!"
      ]);
    } else {
      const ringAction = currentRoom.actions[`ring ${item}`];
      if (ringAction) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> ring ${item}`,
          ringAction
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> ring ${item}`,
          `You can't ring that.`
        ]);
      }
    }
  };

  const handleRub = (item) => {
    // Remove "the " from the beginning of the item if it exists
    const cleanItem = item.replace(/^the /, "");
    
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (cleanItem === "mirror" && gameState.currentRoom === "mirror room south") {
      if (!gameState.roomStates?.["mirror room south"]?.candlesOut) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> rub ${item}`,
          "Nothing happens. The candles need to be extinguished first."
        ]);
        return;
      }
      
      setGameState(prevState => ({
        ...prevState,
        currentRoom: "mirror room north",
        roomStates: {
          ...prevState.roomStates,
          "mirror room south": { 
            ...prevState.roomStates?.["mirror room south"],
            mirrorRubbed: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> rub ${item}`,
        "As you rub the mirror, your surroundings shimmer and shift. You find yourself in a different mirror room!",
        "",
        getBasicRoomDescription("mirror room north")
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> rub ${item}`,
        `Rubbing the ${item} has no effect.`
      ]);
    }
  };

  const handlePutOut = (item) => {
    if (item === "candles" && gameState.inventory.includes("candles") && gameState.currentRoom === "mirror room south") {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "mirror room south": { 
            ...prevState.roomStates?.["mirror room south"],
            candlesOut: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> put out ${item}`,
        "You extinguish the candles."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put out ${item}`,
        `You can't put that out.`
      ]);
    }
  };

  const handleSqueeze = (direction) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (currentRoom.actions[`squeeze ${direction}`]) {
      // Check if player has dropped everything except screwdriver
      const allowedItems = ["screwdriver"];
      const extraItems = gameState.inventory.filter(item => !allowedItems.includes(item));
      
      if (extraItems.length > 0) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> squeeze ${direction}`,
          "You're carrying too much to squeeze through the crack. You need to drop everything except the screwdriver."
        ]);
        return;
      }
      
      const nextRoom = currentRoom.actions[`squeeze ${direction}`];
      setGameState(prevState => ({
        ...prevState,
        currentRoom: nextRoom
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> squeeze ${direction}`,
        getBasicRoomDescription(nextRoom)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> squeeze ${direction}`,
        "You can't squeeze through there."
      ]);
    }
  };

  const handleTakeFrom = (item, container) => {
    if (container === "basket" && gameState.currentRoom === "drafty room") {
      if (gameState.containerContents.basket.includes(item)) {
        setGameState(prevState => ({
          ...prevState,
          inventory: [...prevState.inventory, item],
          containerContents: {
            ...prevState.containerContents,
            basket: prevState.containerContents.basket.filter(i => i !== item)
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `You take the ${item} from the basket.`
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `There is no ${item} in the basket.`
        ]);
      }
      return;
    }

    // Coffin case - no room restriction
    if (container === "coffin") {
      if (item === "sceptre") {
        setGameState(prevState => ({
          ...prevState,
          inventory: [...prevState.inventory, "sceptre"],
          containerContents: {
            ...prevState.containerContents,
            coffin: (prevState.containerContents.coffin || []).filter(i => i !== "sceptre")
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          "Taken."
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `There is no ${item} in the coffin.`
        ]);
      }
      return;
    }

    // Sack case - no room restriction
    if (container === "sack") {
      const sackContents = ["water", "garlic"];
      if (sackContents.includes(item)) {
        setGameState(prevState => ({
          ...prevState,
          inventory: [...prevState.inventory, item],
          containerContents: {
            ...prevState.containerContents,
            sack: (prevState.containerContents.sack || sackContents).filter(i => i !== item)
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `You take the ${item} from the sack.`
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> take ${item} from ${container}`,
          `There is no ${item} in the sack.`
        ]);
      }
      return;
    }

    setGameLog((prevLog) => [
      ...prevLog,
      `> take ${item} from ${container}`,
      "You can't take anything from that."
    ]);
  };

  const handlePutInMachine = (item) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (!gameState.roomStates?.["machine room"]?.lidOpen) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        "The machine's lid is closed."
      ]);
      return;
    }

    if (item === "coal") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== item),
        roomStates: {
          ...prevState.roomStates,
          "machine room": {
            ...prevState.roomStates?.["machine room"],
            coalInMachine: true
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        "You put the coal in the machine."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> put ${item} in machine`,
        "That doesn't belong in the machine."
      ]);
    }
  };

  const handleSlide = () => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    
    if (currentRoom.actions["slide"] || currentRoom.actions["slide down"]) {
      const nextRoom = currentRoom.actions["slide"] || currentRoom.actions["slide down"];
      setGameState(prevState => ({
        ...prevState,
        currentRoom: nextRoom
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        "> slide",
        "Wheeeeeee! You slide down the chute...",
        "",
        getBasicRoomDescription(nextRoom)
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> slide",
        "There's nothing to slide down here."
      ]);
    }
  };

  const handleTurnOn = (item) => {
    if (item === "lamp" && gameState.inventory.includes("lamp")) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          lamp: { isOn: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn on ${item}`,
        "The lamp is now on."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn on ${item}`,
        `You can't turn that on.`
      ]);
    }
  };

  const handleTurnOff = (item) => {
    if (item === "lamp" && gameState.inventory.includes("lamp")) {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          lamp: { isOn: false }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn off ${item}`,
        "The lamp is now off."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> turn off ${item}`,
        `You can't turn that off.`
      ]);
    }
  };

  const handleInflate = (item) => {
    if (item === "plastic" || item === "boat") {
      if (!gameState.inventory.includes("air pump")) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> inflate ${item}`,
          "You need something to inflate it with."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "dam base": { boatInflated: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> inflate ${item}`,
        "The plastic pile inflates into a sturdy rubber boat!"
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> inflate ${item}`,
        "You can't inflate that."
      ]);
    }
  };

  const handleBoard = (item) => {
    if (item === "boat" && gameState.currentRoom === "dam base") {
      if (!gameState.roomStates?.["dam base"]?.boatInflated) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> board ${item}`,
          "The boat needs to be inflated first."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        currentRoom: "in boat"
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> board ${item}`,
        "You board the rubber boat.",
        "",
        getBasicRoomDescription("in boat")
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> board ${item}`,
        "You can't board that."
      ]);
    }
  };

  const handleLaunch = () => {
    if (gameState.currentRoom === "in boat") {
      setGameLog((prevLog) => [
        ...prevLog,
        "> launch",
        "The boat begins to move with the current."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> launch",
        "You're not in anything that can be launched."
      ]);
    }
  };

  const handleWait = () => {
    if (gameState.currentRoom === "in boat") {
      const waitCount = (gameState.roomStates?.["in boat"]?.waitCount || 0) + 1;
      
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "in boat": { 
            waitCount,
            buoyVisible: waitCount >= 3
          }
        }
      }));

      let message = "The boat drifts in the current...";
      if (waitCount === 3) {
        message += "\nYou notice a buoy floating in the water nearby.";
      }

      setGameLog((prevLog) => [
        ...prevLog,
        "> wait",
        message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> wait",
        "Time passes..."
      ]);
    }
  };

  const handleDig = () => {
    if (gameState.currentRoom === "sandy cave") {
      if (!gameState.inventory.includes("shovel")) {
        setGameLog((prevLog) => [
          ...prevLog,
          "> dig",
          "You need a shovel to dig here."
        ]);
        return;
      }

      const digCount = (gameState.roomStates?.["sandy cave"]?.digCount || 0) + 1;
      
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "sandy cave": { 
            digCount,
            scarabRevealed: digCount >= 3
          }
        },
        itemsInWorld: digCount >= 3 ? {
          ...prevState.itemsInWorld,
          scarab: "sandy cave"
        } : prevState.itemsInWorld
      }));

      let message = "You dig in the sand...";
      if (digCount === 3) {
        message += "\nYou uncover an ancient scarab!";
      } else if (digCount > 3) {
        message += "\nYou find nothing else of interest.";
      }

      setGameLog((prevLog) => [
        ...prevLog,
        "> dig",
        message
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> dig",
        "The ground is too hard to dig here."
      ]);
    }
  };

  const handleCross = (target) => {
    if (target === "rainbow" && gameState.currentRoom === "aragain falls") {
      setGameState(prevState => ({
        ...prevState,
        currentRoom: "canyon view"
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> cross ${target}`,
        "You cross the rainbow bridge...",
        "",
        getBasicRoomDescription("canyon view")
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> cross ${target}`,
        "You can't cross that."
      ]);
    }
  };

  const handleTouch = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];
    const touchAction = currentRoom.actions[`touch ${target}`];
    
    if (touchAction) {
      if (target === "skeleton" && gameState.currentRoom === "adventurers remains") {
        handleDeath("skeleton");
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> touch ${target}`,
          touchAction
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> touch ${target}`,
        `You can't touch that.`
      ]);
    }
  };

  const handleDeath = (cause) => {
    const deathMessage = gameData.state.deathMessages[cause];
    setGameState((prevState) => ({
      ...prevState,
      isDead: true
    }));
    setGameLog((prevLog) => [
      ...prevLog,
      `> touch skeleton`,
      deathMessage
    ]);
  };

  const handleWind = (item) => {
    if (item === "canary" && gameState.currentRoom === "tree top") {
      if (!gameState.inventory.includes("jeweled egg")) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> wind canary`,
          "You don't have the jeweled egg."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        inventory: [
          ...prevState.inventory.filter(i => i !== "jeweled egg"),
          "canary",
          "egg"
        ],
        roomStates: {
          ...prevState.roomStates,
          "tree top": { canaryWound: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> wind canary`,
        "You wind up the mechanical canary and carefully remove it from the jeweled egg. Now you have both a beautiful mechanical canary and an exquisite jeweled egg!"
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> wind ${item}`,
        "You can't wind that up."
      ]);
    }
  };

  const handlePray = () => {
    if (gameState.currentRoom === "altar") {
      setGameState(prevState => ({
        ...prevState,
        currentRoom: "forest2"
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        "> pray",
        "You feel a strange sensation, and suddenly find yourself transported...",
        "",
        getBasicRoomDescription("forest2")
      ]);
    } else if (gameState.currentRoom === "temple") {
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          temple: { doorsUnlocked: true }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        "> pray",
        "A voice whispers: 'The doors are now unlocked.'"
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        "> pray",
        "Nothing happens."
      ]);
    }
  };

  const handleGive = (item, target) => {
    if (!gameState.inventory.includes(item)) {
      setGameLog((prevLog) => [
        ...prevLog,
        `> give ${item} to ${target}`,
        `You don't have the ${item}.`
      ]);
      return;
    }

    if (target === "thief" && item === "jeweled egg" && gameState.currentRoom === "treasure room") {
      setGameState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(i => i !== "jeweled egg"),
        thiefInventory: [...(prevState.thiefInventory || []), "jeweled egg"],
        roomStates: {
          ...prevState.roomStates,
          "treasure room": { 
            ...prevState.roomStates?.["treasure room"],
            thiefHasEgg: true 
          }
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> give ${item} to ${target}`,
        "The thief examines the egg carefully and pockets it with a grin."
      ]);
    } else if (target === "cyclops" && (item === "lunch" || item === "water") && 
               gameState.currentRoom === "cyclops room") {
      if (gameState.inventory.includes("lunch") && gameState.inventory.includes("water")) {
        setGameState(prevState => ({
          ...prevState,
          inventory: prevState.inventory.filter(i => i !== "lunch" && i !== "water"),
          roomStates: {
            ...prevState.roomStates,
            "cyclops room": { 
              ...prevState.roomStates?.["cyclops room"],
              cyclopsSleeping: true 
            }
          }
        }));
        setGameLog((prevLog) => [
          ...prevLog,
          `> give food to cyclops`,
          "The cyclops accepts the food and water, then falls into a deep sleep."
        ]);
      } else {
        setGameLog((prevLog) => [
          ...prevLog,
          `> give food to cyclops`,
          "You need both food and water to satisfy the cyclops."
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> give ${item} to ${target}`,
        "That wouldn't be useful."
      ]);
    }
  };

  const handleKill = (target, weapon) => {
    if (target === "thief" && weapon === "knife" && gameState.currentRoom === "treasure room") {
      if (!gameState.inventory.includes("knife")) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> kill thief with knife`,
          "You don't have the knife."
        ]);
        return;
      }

      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "treasure room": { 
            ...prevState.roomStates?.["treasure room"],
            thiefAlive: false 
          }
        },
        itemsInWorld: {
          ...prevState.itemsInWorld,
          ...(prevState.thiefInventory || []).reduce((acc, item) => ({
            ...acc,
            [item]: "treasure room"
          }), {})
        }
      }));
      setGameLog((prevLog) => [
        ...prevLog,
        `> kill thief with knife`,
        "You catch the thief off guard! After a brief struggle, he falls to the ground, dropping his loot."
      ]);
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> kill ${target} with ${weapon}`,
        "Violence isn't the answer to this one."
      ]);
    }
  };

  const handleOpen = (target) => {
    const currentRoom = gameData.rooms[gameState.currentRoom];

    // Special case for grating
    if (target === "grating" && gameState.currentRoom === "grating clearing") {
      // Check if grating is revealed
      if (!gameState.roomStates?.["grating clearing"]?.gratingRevealed) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> open ${target}`,
          "You don't see any grating here."
        ]);
        return;
      }

      // Check if grating is unlocked
      if (!gameState.roomStates?.["grating clearing"]?.gratingUnlocked) {
        setGameLog((prevLog) => [
          ...prevLog,
          `> open ${target}`,
          "The grating is locked."
        ]);
        return;
      }

      // Open the grating
      setGameState(prevState => ({
        ...prevState,
        roomStates: {
          ...prevState.roomStates,
          "grating clearing": {
            ...(prevState.roomStates?.["grating clearing"] || {}),
            gratingOpen: true
          }
        }
      }));

      setGameLog((prevLog) => [
        ...prevLog,
        `> open ${target}`,
        "You open the grating."
      ]);
      return;
    }

    // Handle other cases
    const openAction = currentRoom.actions[`open ${target}`];
    if (openAction) {
      if (typeof openAction === 'string') {
        setGameLog((prevLog) => [
          ...prevLog,
          `> open ${target}`,
          openAction
        ]);
      } else {
        if (openAction.requires) {
          const missingRequirements = openAction.requires.filter(req => !gameState.roomStates?.[gameState.currentRoom]?.[req]);
          if (missingRequirements.length > 0) {
            setGameLog((prevLog) => [
              ...prevLog,
              `> open ${target}`,
              "You can't open that yet."
            ]);
            return;
          }
        }

        if (openAction.sets) {
          setGameState(prevState => ({
            ...prevState,
            roomStates: {
              ...prevState.roomStates,
              [gameState.currentRoom]: {
                ...(prevState.roomStates?.[gameState.currentRoom] || {}),
                ...openAction.sets
              }
            }
          }));
        }

        setGameLog((prevLog) => [
          ...prevLog,
          `> open ${target}`,
          openAction.message
        ]);
      }
    } else {
      setGameLog((prevLog) => [
        ...prevLog,
        `> open ${target}`,
        "You can't open that."
      ]);
    }
  };

  return (
    <div className="game-interface">
      <div className="game-log" ref={logRef}>
        {gameLog.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="What do you want to do?"
          autoFocus
        />
      </form>
    </div>
  );
}

export default GameInterface;
