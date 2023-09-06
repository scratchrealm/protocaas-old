from protocaas import ProtocaasPluginContext, ProtocaasPlugin
from ...ProtocaasPluginTypes import ProtocaasPluginContext
from .CaimanProcessingTool import CaimanProcessingTool

class CalciumImagingPlugin(ProtocaasPlugin):
    @classmethod
    def initialize(cls, context: ProtocaasPluginContext):
        context.register_processing_tool(CaimanProcessingTool)