// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MediaRegistry
/// @notice Anchors SHA-256 media fingerprints and their declared origin on-chain.
/// Deploy to Base Sepolia (chain id 84532), then paste the address into the app
/// under Dashboard -> Registry contract.
contract MediaRegistry {
    enum Origin {
        Human,
        AIGenerated,
        AIAssisted
    }

    struct Record {
        address creator;
        uint8 originType;
        uint64 timestamp;
        string metaURI;
    }

    mapping(bytes32 => Record) public records;

    event Registered(
        bytes32 indexed mediaHash,
        address indexed creator,
        uint8 originType,
        string metaURI,
        uint64 timestamp
    );

    error AlreadyRegistered();
    error InvalidOrigin();

    function register(bytes32 mediaHash, uint8 originType, string calldata metaURI) external {
        if (records[mediaHash].creator != address(0)) revert AlreadyRegistered();
        if (originType > uint8(Origin.AIAssisted)) revert InvalidOrigin();

        records[mediaHash] = Record({
            creator: msg.sender,
            originType: originType,
            timestamp: uint64(block.timestamp),
            metaURI: metaURI
        });

        emit Registered(mediaHash, msg.sender, originType, metaURI, uint64(block.timestamp));
    }

    function isRegistered(bytes32 mediaHash) external view returns (bool) {
        return records[mediaHash].creator != address(0);
    }
}
