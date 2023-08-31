class OutputFile:
    def __init__(self, *, name: str) -> None:
        self._name = name
    def set(self, local_file_path: str):
        ...