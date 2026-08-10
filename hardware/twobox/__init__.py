"""Two-box design: a Sensor Box (acquire + stream) and a Compute Box (train),
cleanly split by the wire contract in protocol.py. Both run on one Xavier today
(localhost) and become two machines later by changing a host flag.

See TWO_BOX_DESIGN.md (in hardware/) for the design; README.md for how to run.
"""
