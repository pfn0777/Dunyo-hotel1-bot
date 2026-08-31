"""`webapp/data.js` and `bot/rooms.py` must agree, room for room.

They are two hand-edited copies of the same truth. Editing one alone makes the
price the guest saw disagree with the price the owner receives — the one failure
the recompute-on-the-server design cannot catch, because the server would be
confidently wrong. This test is the guard.

Run:  python -m unittest test_rooms_sync -v      (from bot/)
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from rooms import ROOMS

DATA_JS = Path(__file__).resolve().parent.parent / "webapp" / "data.js"

# { id: '100', plate: '100', price: 300000, photos: [...] }  — one per room.
ENTRY = re.compile(
    r"\{\s*id:\s*'(?P<id>[^']+)'\s*,\s*"
    r"plate:\s*'(?P<plate>[^']+)'\s*,\s*"
    r"price:\s*(?P<price>\d+|null)\s*,"
    r"(?P<rest>[^}]*)\}"
)


def parse_data_js() -> list[tuple[str, str, int | None, bool]]:
    source = DATA_JS.read_text(encoding="utf-8")
    block = re.search(r"const ROOMS = \[(.*?)\n\];", source, re.DOTALL)
    if block is None:
        raise AssertionError(f"No `const ROOMS = [...]` array found in {DATA_JS}")
    rooms = [
        (m["id"], m["plate"], None if m["price"] == "null" else int(m["price"]), "shared: true" in m["rest"])
        for m in ENTRY.finditer(block.group(1))
    ]
    if not rooms:
        raise AssertionError(f"ROOMS array in {DATA_JS} parsed as empty — did its shape change?")
    return rooms


class RoomsSyncTest(unittest.TestCase):
    def setUp(self) -> None:
        self.web = parse_data_js()
        self.server = [(r.id, r.plate, r.price, r.shared) for r in ROOMS]

    def test_same_room_ids_in_the_same_order(self) -> None:
        self.assertEqual(
            [r[0] for r in self.web],
            [r[0] for r in self.server],
            "Room ids differ between webapp/data.js and bot/rooms.py",
        )

    def test_every_room_matches_exactly(self) -> None:
        for web, server in zip(self.web, self.server):
            with self.subTest(room=web[0]):
                self.assertEqual(web, server, f"Room {web[0]} differs (plate, price or shared flag)")


if __name__ == "__main__":
    unittest.main()
