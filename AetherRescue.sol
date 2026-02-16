// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AetherRescue {

    // --- STATE VARIABLES (Constraint: < 5) ---
    // 1. Owner of the contract (for security)
    address public owner;
    // 2. Replay Protection: Tracks if an Image ID has already been processed
    mapping(string => bool) public processedMissions;

    // --- EVENT (Constraint: Emit at least 1 event) ---
    event SurvivorDetected(string indexed missionId, string coordinates, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    // --- CORE WRITE FUNCTION (Constraint: 1 Write) ---
    // records the rescue data on-chain
    function recordRescue(string memory _missionId, string memory _coordinates) public {
        // Constraint: Replay/Duplicate Protection
        require(!processedMissions[_missionId], "Error: Mission ID already processed.");

        // Mark as processed
        processedMissions[_missionId] = true;

        // Emit Event
        emit SurvivorDetected(_missionId, _coordinates, block.timestamp);
    }

    // --- VIEW FUNCTION (Constraint: 1 View) ---
    // Checks if a specific mission image has been analyzed
    function checkStatus(string memory _missionId) public view returns (bool) {
        return processedMissions[_missionId];
    }
}

Threat: Arbitrary Code Execution (Malicious Uploads)

Mitigation: We enforce strict file type validation (allowing only .jpg, .png) and process all incoming data directly in memory (RAM) without saving files to the server's disk, preventing persistent script execution.

Threat: Denial of Service (DoS) via Large Payloads

Mitigation: The Flask configuration includes a MAX_CONTENT_LENGTH limit (e.g., 5MB) to automatically reject oversized payloads before processing begins, protecting server resources.