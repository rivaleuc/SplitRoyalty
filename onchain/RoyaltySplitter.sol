// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RoyaltySplitter {
    struct Split {
        address payable recipient;
        uint256 percentage;
    }

    mapping(bytes16 => Split[]) public projectSplits;

    event SplitsSet(bytes16 indexed projectKey, uint256 count);
    event RoyaltiesPaid(bytes16 indexed projectKey, uint256 total);

    function setSplits(bytes16 projectKey, address payable[] calldata recipients, uint256[] calldata percentages) external {
        require(recipients.length == percentages.length, "length mismatch");
        uint256 sum;
        for (uint256 i; i < percentages.length; i++) {
            sum += percentages[i];
        }
        require(sum == 100, "must sum to 100");
        delete projectSplits[projectKey];
        for (uint256 i; i < recipients.length; i++) {
            projectSplits[projectKey].push(Split(recipients[i], percentages[i]));
        }
        emit SplitsSet(projectKey, recipients.length);
    }

    function distribute(bytes16 projectKey) external payable {
        Split[] storage splits = projectSplits[projectKey];
        require(splits.length > 0, "no splits set");
        uint256 total = msg.value;
        for (uint256 i; i < splits.length; i++) {
            uint256 amount = (total * splits[i].percentage) / 100;
            splits[i].recipient.transfer(amount);
        }
        emit RoyaltiesPaid(projectKey, total);
    }
}
